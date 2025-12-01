import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useThemeMode } from '../context/ThemeContext';

const Toast = () => {
  const { darkMode } = useThemeMode();
  
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={darkMode ? 'dark' : 'light'}
      toastStyle={{
        borderRadius: 10,
        fontFamily: '"Inter", "Roboto", sans-serif',
        fontSize: '0.875rem',
      }}
      style={{
        top: '80px', // Below the app bar
      }}
    />
  );
};

export default Toast;
