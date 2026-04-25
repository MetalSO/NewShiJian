import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import CreatePost from '../pages/CreatePost';
import PostDetail from '../pages/PostDetail';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import Messages from '../pages/Messages';
import OAuthCallback from '../pages/OAuthCallback';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout><Home /></MainLayout>,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/create',
    element: <MainLayout><CreatePost /></MainLayout>,
  },
  {
    path: '/edit/:id',
    element: <MainLayout><CreatePost /></MainLayout>,
  },
  {
    path: '/post/:id',
    element: <MainLayout><PostDetail /></MainLayout>,
  },
  {
    path: '/profile',
    element: <MainLayout><Profile /></MainLayout>,
  },
  {
    path: '/settings',
    element: <MainLayout><Settings /></MainLayout>,
  },
  {
    path: '/messages',
    element: <MainLayout><Messages /></MainLayout>,
  },
  {
    path: '/oauth/callback',
    element: <OAuthCallback />,
  },
]);

export default router;

