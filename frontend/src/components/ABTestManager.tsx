import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Grid,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, PlayArrow as PlayArrowIcon, Stop as StopIcon } from '@mui/icons-material';

interface ABTest {
  id: string;
  name: string;
  description: string;
  avatar_a_name: string;
  avatar_b_name: string;
  traffic_split: number;
  status: 'active' | 'completed' | 'draft';
  started_at: string;
  metrics: {
    conversations_a: number;
    conversations_b: number;
    satisfaction_a: number;
    satisfaction_b: number;
  };
}

const ABTestManager: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Professional vs Friendly Tone',
      description: 'Testing the impact of professional vs friendly communication style',
      avatar_a_name: 'Professional Assistant',
      avatar_b_name: 'Friendly Helper',
      traffic_split: 50,
      status: 'active',
      started_at: '2024-01-01T00:00:00Z',
      metrics: {
        conversations_a: 156,
        conversations_b: 162,
        satisfaction_a: 4.2,
        satisfaction_b: 4.5,
      },
    },
  ]);

  const [createDialog, setCreateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    avatar_a: '',
    avatar_b: '',
    traffic_split: 50,
  });

  const handleCreateTest = () => {
    const test: ABTest = {
      id: Date.now().toString(),
      name: newTest.name,
      description: newTest.description,
      avatar_a_name: newTest.avatar_a,
      avatar_b_name: newTest.avatar_b,
      traffic_split: newTest.traffic_split,
      status: 'draft',
      started_at: new Date().toISOString(),
      metrics: {
        conversations_a: 0,
        conversations_b: 0,
        satisfaction_a: 0,
        satisfaction_b: 0,
      },
    };

    setTests([...tests, test]);
    setCreateDialog(false);
    setNewTest({ name: '', description: '', avatar_a: '', avatar_b: '', traffic_split: 50 });
    setSuccess('A/B test created successfully');
  };

  const handleStartTest = (testId: string) => {
    setTests(tests.map(test =>
      test.id === testId
        ? { ...test, status: 'active' as const, started_at: new Date().toISOString() }
        : test
    ));
    setSuccess('A/B test started');
  };

  const handleStopTest = (testId: string) => {
    setTests(tests.map(test =>
      test.id === testId
        ? { ...test, status: 'completed' as const }
        : test
    ));
    setSuccess('A/B test stopped');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const calculateWinner = (test: ABTest) => {
    if (test.metrics.conversations_a === 0 && test.metrics.conversations_b === 0) {
      return 'No data yet';
    }

    const score_a = test.metrics.satisfaction_a * test.metrics.conversations_a;
    const score_b = test.metrics.satisfaction_b * test.metrics.conversations_b;

    if (score_a > score_b) return test.avatar_a_name;
    if (score_b > score_a) return test.avatar_b_name;
    return 'Tie';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          A/B Testing
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialog(true)}
        >
          Create Test
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {tests.map((test) => (
          <Grid item xs={12} key={test.id}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {test.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {test.description}
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <Chip
                      label={test.status}
                      color={getStatusColor(test.status)}
                      size="small"
                    />
                    <Chip
                      label={`${test.traffic_split}% / ${100 - test.traffic_split}% split`}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  {test.status === 'draft' && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStartTest(test.id)}
                    >
                      Start
                    </Button>
                  )}
                  {test.status === 'active' && (
                    <Button
                      variant="outlined"
                      startIcon={<StopIcon />}
                      onClick={() => handleStopTest(test.id)}
                    >
                      Stop
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Test Results */}
              {test.status !== 'draft' && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          {test.avatar_a_name}
                        </Typography>
                        <Typography variant="h6">
                          {test.metrics.conversations_a}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          conversations
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {test.metrics.satisfaction_a.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          avg satisfaction
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="textSecondary">
                          {test.avatar_b_name}
                        </Typography>
                        <Typography variant="h6">
                          {test.metrics.conversations_b}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          conversations
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {test.metrics.satisfaction_b.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          avg satisfaction
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Performance Comparison
                      </Typography>
                      <Typography variant="body2" color="primary" gutterBottom>
                        Current Winner: <strong>{calculateWinner(test)}</strong>
                      </Typography>

                      {/* Satisfaction comparison */}
                      <Box mb={2}>
                        <Typography variant="body2" gutterBottom>
                          Satisfaction Score
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(test.metrics.satisfaction_a / 5) * 100}
                          sx={{ mb: 1 }}
                        />
                        <LinearProgress
                          variant="determinate"
                          value={(test.metrics.satisfaction_b / 5) * 100}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Paper>
          </Grid>
        ))}

        {tests.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No A/B tests found
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Create your first A/B test to compare different avatar configurations.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialog(true)}
                sx={{ mt: 2 }}
              >
                Create Test
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Test Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create A/B Test</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Test Name"
              value={newTest.name}
              onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newTest.description}
              onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>Avatar A</InputLabel>
              <Select
                value={newTest.avatar_a}
                onChange={(e) => setNewTest({ ...newTest, avatar_a: e.target.value })}
              >
                <MenuItem value="Professional Assistant">Professional Assistant</MenuItem>
                <MenuItem value="Friendly Helper">Friendly Helper</MenuItem>
                <MenuItem value="Tech Expert">Tech Expert</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Avatar B</InputLabel>
              <Select
                value={newTest.avatar_b}
                onChange={(e) => setNewTest({ ...newTest, avatar_b: e.target.value })}
              >
                <MenuItem value="Professional Assistant">Professional Assistant</MenuItem>
                <MenuItem value="Friendly Helper">Friendly Helper</MenuItem>
                <MenuItem value="Tech Expert">Tech Expert</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Traffic Split (%)</InputLabel>
              <Select
                value={newTest.traffic_split}
                onChange={(e) => setNewTest({ ...newTest, traffic_split: e.target.value as number })}
              >
                <MenuItem value={50}>50% / 50%</MenuItem>
                <MenuItem value={70}>70% / 30%</MenuItem>
                <MenuItem value={30}>30% / 70%</MenuItem>
                <MenuItem value={80}>80% / 20%</MenuItem>
                <MenuItem value={20}>20% / 80%</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTest} variant="contained">
            Create Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ABTestManager;