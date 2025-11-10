import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  // Mock data - in real implementation would come from API
  const conversationData = [
    { date: '2024-01-01', conversations: 45, messages: 234, satisfaction: 4.2 },
    { date: '2024-01-02', conversations: 52, messages: 289, satisfaction: 4.3 },
    { date: '2024-01-03', conversations: 48, messages: 267, satisfaction: 4.1 },
    { date: '2024-01-04', conversations: 61, messages: 342, satisfaction: 4.4 },
    { date: '2024-01-05', conversations: 58, messages: 318, satisfaction: 4.3 },
    { date: '2024-01-06', conversations: 72, messages: 412, satisfaction: 4.5 },
    { date: '2024-01-07', conversations: 65, messages: 367, satisfaction: 4.4 },
  ];

  const intentData = [
    { intent: 'greeting', count: 234, percentage: 28 },
    { intent: 'question', count: 312, percentage: 37 },
    { intent: 'complaint', count: 89, percentage: 11 },
    { intent: 'request', count: 145, percentage: 17 },
    { intent: 'compliment', count: 34, percentage: 4 },
    { intent: 'other', count: 24, percentage: 3 },
  ];

  const avatarPerformance = [
    { name: 'Professional Assistant', conversations: 234, avg_satisfaction: 4.3 },
    { name: 'Friendly Helper', conversations: 189, avg_satisfaction: 4.6 },
    { name: 'Tech Expert', conversations: 156, avg_satisfaction: 4.1 },
    { name: 'Customer Service Bot', conversations: 298, avg_satisfaction: 4.2 },
  ];

  const COLORS = ['#2C5F8D', '#5CA3D5', '#A8D0E6', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, [timeRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Conversation Trends */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Conversation Trends
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="conversations"
                  stroke="#2C5F8D"
                  strokeWidth={2}
                  name="Conversations"
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#5CA3D5"
                  strokeWidth={2}
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Intent Distribution */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Intent Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={intentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {intentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Avatar Performance */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Avatar Performance Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={avatarPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="conversations" fill="#2C5F8D" name="Conversations" />
                <Bar dataKey="avg_satisfaction" fill="#5CA3D5" name="Avg Satisfaction" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} lg={6}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    4.3
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Average Satisfaction
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    1.2s
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg Response Time
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    234
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Conversations
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card>
                <CardContent>
                  <Typography variant="h4" color="primary">
                    87%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Resolution Rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Satisfaction Trends */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Customer Satisfaction Trends
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[3.5, 5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="#4CAF50"
                  strokeWidth={3}
                  name="Satisfaction Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;