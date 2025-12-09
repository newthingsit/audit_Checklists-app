import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Paper,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from '@mui/material/Switch';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import axios from 'axios';
import Layout from '../components/Layout';
import { showSuccess, showError } from '../utils/toast';

const Stores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [parsedStores, setParsedStores] = useState([]);
  const [parseError, setParseError] = useState('');
  const [editingStore, setEditingStore] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [showInactive, setShowInactive] = useState(false); // Show inactive stores filter
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    store: null,
    auditCount: 0,
    isForceDelete: false
  });
  const [formData, setFormData] = useState({
    store_number: '',
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    parent_id: '',
    region: '',
    district: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await axios.get('/api/locations');
      setStores(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (store = null) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        store_number: store.store_number || '',
        name: store.name,
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        country: store.country || '',
        phone: store.phone || '',
        email: store.email || '',
        parent_id: store.parent_id || '',
        region: store.region || '',
        district: store.district || '',
        latitude: store.latitude || '',
        longitude: store.longitude || '',
        is_active: store.is_active !== undefined && store.is_active !== null ? (store.is_active ? 1 : 0) : 1
      });
    } else {
      setEditingStore(null);
      setFormData({
        store_number: '',
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        email: '',
        parent_id: '',
        region: '',
        district: '',
        latitude: '',
        longitude: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStore(null);
  };

  const handleSave = async () => {
    try {
      // Ensure is_active is included in formData (default to 1 if not set)
      const dataToSend = {
        ...formData,
        is_active: formData.is_active !== undefined ? (formData.is_active ? 1 : 0) : 1
      };
      
      if (editingStore) {
        await axios.put(`/api/locations/${editingStore.id}`, dataToSend);
        showSuccess('Store updated successfully!');
      } else {
        await axios.post('/api/locations', dataToSend);
        showSuccess('Store created successfully!');
      }
      handleCloseDialog();
      // Refresh stores list immediately
      await fetchStores();
    } catch (error) {
      console.error('Error saving store:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Error saving store';
      showError(errorMsg);
    }
  };

  const handleDeleteClick = (store) => {
    setDeleteConfirmDialog({
      open: true,
      store: store,
      auditCount: 0,
      isForceDelete: false
    });
  };

  const handleDeleteConfirm = async (forceDelete = false) => {
    const { store } = deleteConfirmDialog;
    if (!store) return;

    // Close dialog immediately for better UX, then perform async operation
    setDeleteConfirmDialog({ open: false, store: null, auditCount: 0, isForceDelete: false });

    // Use setTimeout to defer the async operation and prevent blocking the UI thread
    setTimeout(async () => {
      try {
        const url = forceDelete 
          ? `/api/locations/${store.id}?force=true` 
          : `/api/locations/${store.id}`;
        
        const response = await axios.delete(url);
        
        if (response.data.deletedAudits) {
          showSuccess(`Store and ${response.data.deletedAudits} audit(s) deleted successfully!`);
        } else {
          showSuccess('Store deleted successfully!');
        }
        
        // Refresh stores list immediately
        await fetchStores();
      } catch (error) {
        console.error('Error deleting store:', error);
        
        // Handle 409 Conflict - store has audits
        if (error.response?.status === 409 && error.response?.data?.canForceDelete) {
          setDeleteConfirmDialog(prev => ({
            open: true,
            store: prev.store || store,
            auditCount: error.response.data.auditCount,
            isForceDelete: true
          }));
          return; // Reopen dialog with force delete option
        }
        
        // Show specific error message from server
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error deleting store';
        showError(errorMessage);
      }
    }, 0);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog({ open: false, store: null, auditCount: 0, isForceDelete: false });
  };

  // Helper function to check if store is inactive
  const isStoreInactive = (store) => {
    return store.is_active === 0 || store.is_active === false;
  };

  const handleToggleActive = async (store) => {
    // Use setTimeout to defer the async operation and prevent blocking the UI thread
    setTimeout(async () => {
      try {
        const response = await axios.patch(`/api/locations/${store.id}/toggle-active`);
        showSuccess(response.data.message);
        // Refresh stores list immediately
        await fetchStores();
      } catch (error) {
        console.error('Error toggling store status:', error);
        const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update store status';
        showError(errorMsg);
      }
    }, 0);
  };

  // Filter stores based on active status (handle null/undefined as active for backward compatibility)
  const filteredStores = showInactive 
    ? stores 
    : stores.filter(s => !isStoreInactive(s));
  const inactiveCount = stores.filter(s => isStoreInactive(s)).length;

  // Improved CSV parser that handles quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parseCSVData = (csvText) => {
    try {
      setParseError('');
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setParseError('CSV must have at least a header row and one data row');
        setParsedStores([]);
        return;
      }

      // Parse header
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const headerMap = {
        store: headers.findIndex(h => h === 'store' || h === 'store number' || h === 'storenumber'),
        storeName: headers.findIndex(h => h === 'store name' || h === 'storename' || h === 'name'),
        address: headers.findIndex(h => h === 'address' || h === 'brand name' || h === 'brandname'),
        city: headers.findIndex(h => h === 'city'),
        state: headers.findIndex(h => h === 'state'),
        country: headers.findIndex(h => h === 'country'),
        phone: headers.findIndex(h => h === 'phone' || h === 'phone number'),
        email: headers.findIndex(h => h === 'email'),
        latitude: headers.findIndex(h => h === 'latitude' || h === 'lat'),
        longitude: headers.findIndex(h => h === 'longitude' || h === 'lng' || h === 'long')
      };

      // Check for required fields
      if (headerMap.storeName === -1 && headerMap.store === -1) {
        setParseError('CSV must have a "Store Name" or "Store" column');
        setParsedStores([]);
        return;
      }

      // Parse data rows
      const stores = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const storeName = headerMap.storeName >= 0 ? values[headerMap.storeName]?.replace(/^"|"$/g, '').trim() : '';
        const store = headerMap.store >= 0 ? values[headerMap.store]?.replace(/^"|"$/g, '').trim() : '';
        
        if (storeName || store) {
          const latValue = headerMap.latitude >= 0 ? values[headerMap.latitude]?.replace(/^"|"$/g, '').trim() : '';
          const lngValue = headerMap.longitude >= 0 ? values[headerMap.longitude]?.replace(/^"|"$/g, '').trim() : '';
          
          stores.push({
            store: store || '',
            storeName: storeName || '',
            address: headerMap.address >= 0 ? (values[headerMap.address]?.replace(/^"|"$/g, '').trim() || '') : '',
            city: headerMap.city >= 0 ? (values[headerMap.city]?.replace(/^"|"$/g, '').trim() || '') : '',
            state: headerMap.state >= 0 ? (values[headerMap.state]?.replace(/^"|"$/g, '').trim() || '') : '',
            country: headerMap.country >= 0 ? (values[headerMap.country]?.replace(/^"|"$/g, '').trim() || '') : '',
            phone: headerMap.phone >= 0 ? (values[headerMap.phone]?.replace(/^"|"$/g, '').trim() || '') : '',
            email: headerMap.email >= 0 ? (values[headerMap.email]?.replace(/^"|"$/g, '').trim() || '') : '',
            latitude: latValue && !isNaN(parseFloat(latValue)) ? parseFloat(latValue) : '',
            longitude: lngValue && !isNaN(parseFloat(lngValue)) ? parseFloat(lngValue) : ''
          });
        }
      }

      if (stores.length === 0) {
        setParseError('No valid stores found in CSV');
        setParsedStores([]);
        return;
      }

      setParsedStores(stores);
    } catch (error) {
      setParseError(`Error parsing CSV: ${error.message}`);
      setParsedStores([]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setCsvData(text);
      parseCSVData(text);
    };
    reader.onerror = () => {
      showError('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleCsvDataChange = (text) => {
    setCsvData(text);
    if (text.trim()) {
      parseCSVData(text);
    } else {
      setParsedStores([]);
      setParseError('');
    }
  };

  const handleCSVImport = async () => {
    if (!csvData || parsedStores.length === 0) {
      showError('Please provide valid CSV data');
      return;
    }

    if (parseError) {
      showError('Please fix CSV errors before importing');
      return;
    }

    setImporting(true);
    try {
      const response = await axios.post('/api/locations/import', { stores: parsedStores });
      showSuccess(response.data.message);
      fetchStores();
      setOpenImportDialog(false);
      setCsvData('');
      setParsedStores([]);
      setParseError('');
    } catch (error) {
      console.error('Import error:', error);
      showError(error.response?.data?.error || 'Failed to import CSV file');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Store,Store Name,Brand Name,City,State,Country,Phone,Email,Latitude,Longitude
5438,PG Ambience Mall GGN,Punjab Grill,Gurugram,Haryana,India,+91-1234567890,store5438@example.com,28.4595,77.0266
5046,PG Palladium Mumbai,Punjab Grill,Mumbai,Maharashtra,India,+91-9876543210,store5046@example.com,19.0760,72.8777
5040,PG Phoenix Pune,Punjab Grill,Pune,Maharashtra,India,+91-1122334455,store5040@example.com,18.5204,73.8567
5025,PG Select City Saket,Punjab Grill,New Delhi,Delhi,India,+91-5566778899,store5025@example.com,28.5275,77.2186`;
    
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stores-sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleOpenImportDialog = () => {
    setCsvData('');
    setParsedStores([]);
    setParseError('');
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    if (!importing) {
      setOpenImportDialog(false);
      setCsvData('');
      setParsedStores([]);
      setParseError('');
    }
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleExportCSV = () => {
    try {
      // CSV Headers
      const headers = [
        'Store Number',
        'Store Name',
        'Brand Name',
        'City',
        'State',
        'Country',
        'Phone',
        'Email',
        'Latitude',
        'Longitude'
      ];

      // CSV Rows
      const rows = stores.map(store => {
        const row = [
          store.store_number || '',
          store.name || '',
          store.address || '',
          store.city || '',
          store.state || '',
          store.country || '',
          store.phone || '',
          store.email || '',
          store.latitude || '',
          store.longitude || ''
        ];
        // Escape commas and quotes in CSV
        return row.map(cell => {
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',');
      });

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `stores-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showSuccess('Stores exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Failed to export CSV');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#333' }}>
            Stores
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Show Inactive {inactiveCount > 0 && `(${inactiveCount})`}
                </Typography>
              }
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              size="small"
            >
              <ToggleButton value="card" aria-label="card view">
                <ViewModuleIcon sx={{ mr: 1 }} />
                Card
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                <ViewListIcon sx={{ mr: 1 }} />
                List
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportCSV}
              disabled={stores.length === 0}
            >
              Download CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={handleOpenImportDialog}
            >
              Import CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Store
            </Button>
          </Box>
        </Box>

        {stores.length === 0 ? (
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <StorefrontIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No stores added yet
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Add your first store to start managing multiple locations
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                >
                  Add First Store
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : viewMode === 'card' ? (
          <Grid container spacing={3}>
            {filteredStores.map((store) => (
              <Grid item xs={12} sm={6} md={4} key={store.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: isStoreInactive(store) ? 'error.light' : 'divider',
                    transition: 'all 0.3s ease',
                    opacity: isStoreInactive(store) ? 0.7 : 1,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                      borderColor: isStoreInactive(store) ? 'error.main' : 'primary.main'
                    }
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'start', flex: 1 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: 'primary.light',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2
                          }}
                        >
                          <StorefrontIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            {store.store_number && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                Store #{store.store_number}
                              </Typography>
                            )}
                            <Chip
                              label={isStoreInactive(store) ? 'Inactive' : 'Active'}
                              color={isStoreInactive(store) ? 'error' : 'success'}
                              size="small"
                              sx={{ height: 20, fontSize: '0.65rem' }}
                            />
                          </Box>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            {store.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {store.address}
                          </Typography>
                          {(store.city || store.state) && (
                            <Typography variant="body2" color="text.secondary">
                              {[store.city, store.state, store.country].filter(Boolean).join(', ')}
                            </Typography>
                          )}
                          {(store.region || store.district) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {[store.region, store.district].filter(Boolean).join(' • ')}
                            </Typography>
                          )}
                          {store.latitude && store.longitude && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                              <LocationOnIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography variant="caption" color="success.main" sx={{ fontWeight: 500 }}>
                                GPS Verified
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Tooltip title={isStoreInactive(store) ? 'Activate Store' : 'Deactivate Store'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleActive(store)}
                            sx={{ color: isStoreInactive(store) ? 'error.main' : 'success.main' }}
                          >
                            {isStoreInactive(store) ? <CancelIcon /> : <CheckCircleIcon />}
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(store)}
                          sx={{ color: 'primary.main' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(store)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>

                    {store.phone && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        📞 {store.phone}
                      </Typography>
                    )}
                    {store.email && (
                      <Typography variant="body2" color="text.secondary">
                        ✉️ {store.email}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Card>
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Store #</strong></TableCell>
                      <TableCell><strong>Store Name</strong></TableCell>
                      <TableCell><strong>Brand Name</strong></TableCell>
                      <TableCell><strong>Address</strong></TableCell>
                      <TableCell><strong>City</strong></TableCell>
                      <TableCell><strong>State</strong></TableCell>
                      <TableCell><strong>Country</strong></TableCell>
                      <TableCell><strong>Phone</strong></TableCell>
                      <TableCell><strong>Email</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStores.map((store) => (
                      <TableRow key={store.id} hover>
                        <TableCell>
                          <Chip
                            label={isStoreInactive(store) ? 'Inactive' : 'Active'}
                            color={isStoreInactive(store) ? 'error' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{store.store_number || '-'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StorefrontIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {store.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{store.address || '-'}</TableCell>
                        <TableCell>{store.address || '-'}</TableCell>
                        <TableCell>{store.city || '-'}</TableCell>
                        <TableCell>{store.state || '-'}</TableCell>
                        <TableCell>{store.country || '-'}</TableCell>
                        <TableCell>{store.phone || '-'}</TableCell>
                        <TableCell>{store.email || '-'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <Tooltip title={isStoreInactive(store) ? 'Activate Store' : 'Deactivate Store'}>
                              <IconButton
                                size="small"
                                onClick={() => handleToggleActive(store)}
                                sx={{ color: isStoreInactive(store) ? 'error.main' : 'success.main' }}
                              >
                                {isStoreInactive(store) ? <CancelIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(store)}
                              sx={{ color: 'primary.main' }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(store)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
          disableEnforceFocus
          PaperProps={{
            sx: {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle
            sx={{
              pb: 2,
              borderBottom: '1px solid #e0e0e0',
              fontWeight: 600,
              fontSize: '1.25rem'
            }}
          >
            {editingStore ? 'Edit Store' : 'Add New Store'}
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <TextField
              fullWidth
              label="Store Number"
              value={formData.store_number}
              onChange={(e) => setFormData({ ...formData, store_number: e.target.value })}
              margin="normal"
              placeholder="e.g., 5438"
            />
            <TextField
              fullWidth
              label="Store Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Brand Name"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              margin="normal"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  margin="normal"
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  margin="normal"
                  placeholder="e.g., North, South, East, West"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="District"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  margin="normal"
                  placeholder="e.g., District 1, District 2"
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              select
              label="Parent Location (Optional)"
              value={formData.parent_id || ''}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
              margin="normal"
              SelectProps={{
                native: true,
              }}
            >
              <option value="">None (Top Level)</option>
              {stores
                .filter(store => !editingStore || store.id !== editingStore.id)
                .map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} {store.store_number ? `(#${store.store_number})` : ''}
                  </option>
                ))}
            </TextField>
            
            {/* GPS Coordinates Section */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  GPS Coordinates (for Location Verification)
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Add GPS coordinates to enable location verification when auditors start audits at this store.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    type="number"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    margin="normal"
                    placeholder="e.g., 28.6139"
                    inputProps={{ step: 'any' }}
                    helperText="Decimal degrees (e.g., 28.6139)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    type="number"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    margin="normal"
                    placeholder="e.g., 77.2090"
                    inputProps={{ step: 'any' }}
                    helperText="Decimal degrees (e.g., 77.2090)"
                  />
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                size="small"
                startIcon={<MyLocationIcon />}
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setFormData({
                          ...formData,
                          latitude: position.coords.latitude.toFixed(6),
                          longitude: position.coords.longitude.toFixed(6)
                        });
                        showSuccess('Location captured successfully!');
                      },
                      (error) => {
                        showError('Failed to get location. Please enter coordinates manually.');
                        console.error('Geolocation error:', error);
                      }
                    );
                  } else {
                    showError('Geolocation is not supported by your browser.');
                  }
                }}
                sx={{ mt: 1 }}
              >
                Use My Current Location
              </Button>
              {formData.latitude && formData.longitude && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<LocationOnIcon />}
                    href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Google Maps
                  </Button>
                </Box>
              )}
            </Box>
            
            {/* Active Status Toggle */}
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Store Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formData.is_active === 1 ? 'Active - Store is visible and can be used for audits' : 'Inactive - Store is hidden from users'}
                    </Typography>
                  </Box>
                }
              />
            </Box>
          </DialogContent>
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid #e0e0e0',
              gap: 2
            }}
          >
            <Button
              onClick={handleCloseDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                borderColor: '#e0e0e0',
                color: '#666',
                '&:hover': {
                  borderColor: '#1976d2',
                  color: '#1976d2',
                },
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
              }}
            >
              {editingStore ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* CSV Import Dialog */}
        <Dialog
          open={openImportDialog}
          onClose={handleCloseImportDialog}
          maxWidth="lg"
          fullWidth
          disableEnforceFocus
          PaperProps={{
            sx: {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 2,
            borderBottom: '1px solid #e0e0e0'
          }}>
            Import Stores from CSV
            <IconButton onClick={handleCloseImportDialog} size="small" sx={{ color: '#666' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="csv-upload-stores"
                type="file"
                onChange={handleFileUpload}
              />
              <label htmlFor="csv-upload-stores">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<UploadFileIcon />}
                  fullWidth
                >
                  Upload CSV File
                </Button>
              </label>
            </Box>
            <Button
              variant="text"
              onClick={handleDownloadSampleCsv}
              startIcon={<DownloadIcon />}
              sx={{ mb: 2 }}
            >
              Download Sample CSV
            </Button>
            <TextField
              fullWidth
              label="Paste CSV Data or Edit Below"
              value={csvData}
              onChange={(e) => handleCsvDataChange(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              placeholder="Store,Store Name,Brand Name,City,State,Country,Phone,Email,Latitude,Longitude&#10;5438,PG Ambience Mall GGN,Punjab Grill,Gurugram,Haryana,India,+91-1234567890,store@example.com,28.4595,77.0266"
              helperText="Only 'Store Name' column is required. Add Latitude/Longitude for GPS location verification."
            />
            
            {parseError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {parseError}
              </Alert>
            )}

            {parsedStores.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Preview: {parsedStores.length} store(s) found
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>#</strong></TableCell>
                        <TableCell><strong>Store #</strong></TableCell>
                        <TableCell><strong>Store Name</strong></TableCell>
                        <TableCell><strong>Brand Name</strong></TableCell>
                        <TableCell><strong>City</strong></TableCell>
                        <TableCell><strong>State</strong></TableCell>
                        <TableCell><strong>Country</strong></TableCell>
                        <TableCell><strong>Phone</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Latitude</strong></TableCell>
                        <TableCell><strong>Longitude</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parsedStores.map((store, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{store.store || '-'}</TableCell>
                          <TableCell>{store.storeName || '-'}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {store.address || '-'}
                          </TableCell>
                          <TableCell>{store.city || '-'}</TableCell>
                          <TableCell>{store.state || '-'}</TableCell>
                          <TableCell>{store.country || '-'}</TableCell>
                          <TableCell>{store.phone || '-'}</TableCell>
                          <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {store.email || '-'}
                          </TableCell>
                          <TableCell sx={{ color: store.latitude ? 'success.main' : 'text.secondary' }}>
                            {store.latitude || '-'}
                          </TableCell>
                          <TableCell sx={{ color: store.longitude ? 'success.main' : 'text.secondary' }}>
                            {store.longitude || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Simple CSV Format:</strong><br />
                • <strong>Required:</strong> Store Name (or Store/Store Number column)<br />
                • <strong>Optional:</strong> Store Number, Brand Name, City, State, Country, Phone, Email, Latitude, Longitude<br />
                • <strong>GPS Coordinates:</strong> Add Latitude and Longitude columns for location verification<br />
                • <strong>Column names are flexible:</strong> "Store Name" or "Name", "Latitude" or "Lat", "Longitude" or "Lng"<br />
                • <strong>Quoted fields supported:</strong> Use quotes for values containing commas<br />
                <br />
                <strong>Example:</strong><br />
                <code style={{ fontSize: '11px' }}>
                  Store,Store Name,Brand Name,City,State,Latitude,Longitude<br />
                  5438,PG Ambience Mall GGN,Punjab Grill,Gurugram,Haryana,28.4595,77.0266<br />
                  5046,PG Palladium Mumbai,Punjab Grill,Mumbai,Maharashtra,19.0760,72.8777
                </code>
              </Typography>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2, 
            borderTop: '1px solid #e0e0e0',
            gap: 2
          }}>
            <Button 
              onClick={handleCloseImportDialog}
              disabled={importing}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                borderColor: '#e0e0e0',
                color: '#666',
                '&:hover': {
                  borderColor: '#1976d2',
                  color: '#1976d2',
                },
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCSVImport} 
              variant="contained"
              disabled={!csvData || !parsedStores.length || parseError || importing}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                bgcolor: '#1976d2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
                '&:disabled': {
                  bgcolor: '#e0e0e0',
                },
              }}
            >
              {importing ? 'Importing...' : `Import ${parsedStores.length} Store(s)`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmDialog.open}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
          disableEnforceFocus
          disableAutoFocus
          PaperProps={{
            sx: {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            color: deleteConfirmDialog.isForceDelete ? 'error.main' : 'text.primary'
          }}>
            {deleteConfirmDialog.isForceDelete && <WarningAmberIcon color="error" />}
            {deleteConfirmDialog.isForceDelete ? 'Warning: Store Has Audits' : 'Delete Store'}
          </DialogTitle>
          <DialogContent>
            {deleteConfirmDialog.isForceDelete ? (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>This store has {deleteConfirmDialog.auditCount} audit(s) associated with it.</strong>
                </Alert>
                <DialogContentText>
                  You are about to permanently delete <strong>"{deleteConfirmDialog.store?.name}"</strong> and all {deleteConfirmDialog.auditCount} associated audit(s).
                </DialogContentText>
                <DialogContentText sx={{ mt: 2, color: 'error.main', fontWeight: 500 }}>
                  ⚠️ This action cannot be undone. All audit data, responses, and photos for this store will be permanently lost.
                </DialogContentText>
              </Box>
            ) : (
              <DialogContentText>
                Are you sure you want to delete <strong>"{deleteConfirmDialog.store?.name}"</strong>?
                {deleteConfirmDialog.store?.store_number && (
                  <span> (Store #{deleteConfirmDialog.store.store_number})</span>
                )}
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button 
              onClick={handleDeleteCancel}
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
              }}
            >
              Cancel
            </Button>
            {deleteConfirmDialog.isForceDelete ? (
              <Button
                onClick={() => handleDeleteConfirm(true)}
                variant="contained"
                color="error"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Delete Store & {deleteConfirmDialog.auditCount} Audit(s)
              </Button>
            ) : (
              <Button
                onClick={() => handleDeleteConfirm(false)}
                variant="contained"
                color="error"
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                }}
              >
                Delete Store
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default Stores;


