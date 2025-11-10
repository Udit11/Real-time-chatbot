import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AvatarDesigner from './components/AvatarDesigner';
import AvatarList from './components/AvatarList';
import TrainingDataManager from './components/TrainingDataManager';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ABTestManager from './components/ABTestManager';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="avatars" element={<AvatarList />} />
          <Route path="avatars/:id" element={<AvatarDesigner />} />
          <Route path="avatars/new" element={<AvatarDesigner />} />
          <Route path="training" element={<TrainingDataManager />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="ab-tests" element={<ABTestManager />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Box>
  );
}

export default App;