import React from 'react';
import { Box, Skeleton, Grid, Card, CardContent } from '@mui/material';
import { themeConfig } from '../../config/theme';

// Card Skeleton for dashboard and audit cards
export const CardSkeleton = ({ count = 1 }) => (
  <Grid container spacing={3}>
    {[...Array(count)].map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <Card sx={{ 
          borderRadius: themeConfig.borderRadius.medium,
          overflow: 'hidden',
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Skeleton 
                variant="circular" 
                width={48} 
                height={48} 
                sx={{ mr: 2 }}
                animation="wave"
              />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="80%" height={24} animation="wave" />
                <Skeleton variant="text" width="60%" height={18} animation="wave" />
              </Box>
            </Box>
            <Skeleton variant="rounded" width={80} height={24} sx={{ mb: 2 }} animation="wave" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Skeleton variant="rounded" width={70} height={24} animation="wave" />
              <Skeleton variant="rounded" width={50} height={24} animation="wave" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Stat Card Skeleton for dashboard stats
export const StatCardSkeleton = ({ count = 4 }) => (
  <Grid container spacing={3}>
    {[...Array(count)].map((_, index) => (
      <Grid item xs={12} sm={6} md={3} key={index}>
        <Card sx={{ 
          borderRadius: themeConfig.borderRadius.medium,
          overflow: 'hidden',
          background: `linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 100%)`,
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Skeleton 
                variant="circular" 
                width={44} 
                height={44} 
                sx={{ mr: 2 }}
                animation="wave"
              />
              <Box>
                <Skeleton variant="text" width={60} height={36} animation="wave" />
                <Skeleton variant="text" width={80} height={18} animation="wave" />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 5, rows = 5 }) => (
  <Box>
    {[...Array(rows)].map((_, rowIndex) => (
      <Box 
        key={rowIndex} 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          py: 2, 
          px: 2,
          borderBottom: `1px solid ${themeConfig.border.light}`,
        }}
      >
        {[...Array(columns)].map((_, colIndex) => (
          <Box key={colIndex} sx={{ flex: 1, px: 1 }}>
            <Skeleton 
              variant="text" 
              width={colIndex === 0 ? '80%' : '60%'} 
              height={24} 
              animation="wave"
            />
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

// Chart Skeleton
export const ChartSkeleton = ({ height = 300 }) => (
  <Card sx={{ borderRadius: themeConfig.borderRadius.medium }}>
    <CardContent>
      <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} animation="wave" />
      <Skeleton 
        variant="rounded" 
        width="100%" 
        height={height} 
        animation="wave"
        sx={{ borderRadius: themeConfig.borderRadius.medium }}
      />
    </CardContent>
  </Card>
);

// Full Page Loading
export const PageLoadingSkeleton = () => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ mb: 4 }}>
      <Skeleton variant="text" width={200} height={40} animation="wave" />
      <Skeleton variant="text" width={350} height={24} animation="wave" />
    </Box>
    <StatCardSkeleton count={4} />
    <Box sx={{ mt: 4 }}>
      <ChartSkeleton />
    </Box>
    <Box sx={{ mt: 4 }}>
      <CardSkeleton count={6} />
    </Box>
  </Box>
);

// Shimmer effect component
export const Shimmer = ({ width = '100%', height = 20, borderRadius = 4 }) => (
  <Box
    sx={{
      width,
      height,
      borderRadius: `${borderRadius}px`,
      background: `linear-gradient(90deg, 
        ${themeConfig.border.light} 25%, 
        ${themeConfig.background.paper} 50%, 
        ${themeConfig.border.light} 75%
      )`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
      '@keyframes shimmer': {
        '0%': { backgroundPosition: '200% 0' },
        '100%': { backgroundPosition: '-200% 0' },
      },
    }}
  />
);

export default {
  CardSkeleton,
  StatCardSkeleton,
  TableRowSkeleton,
  ChartSkeleton,
  PageLoadingSkeleton,
  Shimmer,
};

