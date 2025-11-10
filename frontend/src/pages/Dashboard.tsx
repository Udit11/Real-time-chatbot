import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People as PeopleIcon,
  Message as MessageIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface DashboardStats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  total_avatars: number;
  average_response_time: number;
  satisfaction_score: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_conversations: 0,
    active_conversations: 0,
    total_messages: 0,
    total_avatars: 0,
    average_response_time: 0,
    satisfaction_score: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be actual API endpoints
      // For now, we'll simulate with mock data

      // Get avatars count
      const avatarsResponse = await axios.get('/api/avatars/');
      const avatarsCount = avatarsResponse.data.length;

      // Mock other stats (would come from analytics endpoints)
      const mockStats: DashboardStats = {
        total_conversations: 1247,
        active_conversations: 23,
        total_messages: 5632,
        total_avatars: avatarsCount,
        average_response_time: 1.2,
        satisfaction_score: 4.3,
      };

      setStats(mockStats);
    } catch (err) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
  }> = ({ title, value, icon, subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              backgroundColor: 'primary.main',
              color: 'white',
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h4" component="div">
              {loading ? <CircularProgress size={24} /> : value}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Conversations"
            value={stats.total_conversations.toLocaleString()}
            icon={<PeopleIcon />}
            subtitle="All time"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Conversations"
            value={stats.active_conversations}
            icon={<MessageIcon />}
            subtitle="Currently online"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Messages"
            value={stats.total_messages.toLocaleString()}
            icon={<TrendingUpIcon />}
            subtitle="All time"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Avatars"
            value={stats.total_avatars}
            icon={<PersonIcon />}
            subtitle="Configured"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Average Response Time
                  </Typography>
                  <Typography variant="h5">
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : (
                      `${stats.average_response_time}s`
                    )}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Satisfaction Score
                  </Typography>
                  <Typography variant="h5">
                    {loading ? (
                      <CircularProgress size={20} />
                    ) : (
                      `${stats.satisfaction_score}/5.0`
                    )}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => window.open('/avatars/new', '_self')}
                >
                  <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body1">Create New Avatar</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => window.open('/analytics', '_self')}
                >
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body1">View Analytics</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Recent activity feed will be displayed here. This would show recent conversations,
              avatar updates, and system events in a real implementation.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;