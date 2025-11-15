import React, { useState, useEffect } from 'react';
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
import axios from 'axios';

interface ABTest {
  id: string;
  name: string;
  description?: string;
  avatar_a_id?: string | null;
  avatar_b_id?: string | null;
  traffic_split: number;
  is_active: boolean;
  started_at?: string | null;
  ended_at?: string | null;
  metrics?: any;
}

interface AvatarOption {
  id: string;
  name: string;
  preview?: string;
}

// Generate inline SVG preview (compact) when no logo image is available
const generateInlineAvatarSVG = (skinTone: string, primary: string, secondary: string, gender: string) => {
  const hairColor = gender === 'male' ? '#1f2937' : gender === 'female' ? '#3b2f2f' : '#4b5563';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${primary}" />
          <stop offset="1" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <rect x="0" y="56" width="120" height="64" rx="10" fill="url(#g)"/>
      <rect x="50" y="40" width="20" height="10" rx="2.5" fill="${skinTone}"/>
      <rect x="28" y="6" width="64" height="64" rx="14" fill="${skinTone}" stroke="rgba(0,0,0,0.06)" stroke-width="0.8"/>
      ${gender === 'female'
        ? `<path d="M28 28 C30 18,36 14,60 18 C84 14,90 18,92 28 L92 28 C88 36,88 56,74 62 C64 66,46 66,36 62 C22 56,22 36,28 28 Z" fill="${hairColor}" />`
        : gender === 'male'
        ? `<path d="M30 24 C38 14,82 14,90 24 L90 24 C84 22,70 18,60 20 C50 18,36 20,30 24 Z" fill="${hairColor}" />`
        : `<path d="M30 22 C40 12,80 12,90 22 C84 18,72 14,60 16 C48 14,36 16,30 22 Z" fill="${hairColor}" />`}
      <ellipse cx="47.5" cy="46" rx="3.2" ry="2.6" fill="#111827"/>
      <ellipse cx="72.5" cy="46" rx="3.2" ry="2.6" fill="#111827"/>
      <path d="M52 56 q8 6 16 0" stroke="#3b3b3b" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const ABTestManager: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);

  const [createDialog, setCreateDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    avatar_a_id: '',
    avatar_b_id: '',
    traffic_split: 50,
  });

  useEffect(() => {
    loadTests();
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      const res = await axios.get('/api/avatars/');
      const list = (res.data || []).map((a: any) => {
        // pick logo if available, otherwise generate inline SVG from appearance
        let preview = a.branding_elements?.logo_url || '';
        if (!preview) {
          const skin = a.visual_appearance?.face?.skin_tone || '#e0b084';
          const prim = a.visual_appearance?.clothing?.primary_color || '#667eea';
          const sec = a.visual_appearance?.clothing?.secondary_color || '#764ba2';
          const gender = a.voice_characteristics?.gender || 'neutral';
          try {
            preview = generateInlineAvatarSVG(skin, prim, sec, gender);
          } catch (err) {
            preview = '';
          }
        }
        return { id: a.id, name: a.name, preview };
      });
      setAvatars(list);
    } catch (err) {
      console.warn('Failed to load avatars for AB tests', err);
    }
  };

  const loadTests = async () => {
    try {
      // backend A/B test endpoints are mounted under the avatars router
      const res = await axios.get('/api/avatars/ab-tests');
      setTests(res.data || []);
    } catch (err) {
      console.error('Failed to load A/B tests', err);
      setError('Failed to load A/B tests');
    }
  };

  const handleCreateTest = () => {
    // Create via API
    (async () => {
      try {
        const payload = {
          name: newTest.name,
          description: newTest.description,
          avatar_a_id: newTest.avatar_a_id || null,
          avatar_b_id: newTest.avatar_b_id || null,
          traffic_split: newTest.traffic_split || 50
        };
        // create via avatars router AB-tests path
        const res = await axios.post('/api/avatars/ab-tests', payload);
        setTests(prev => [res.data, ...prev]);
        setCreateDialog(false);
        setNewTest({ name: '', description: '', avatar_a_id: '', avatar_b_id: '', traffic_split: 50 });
        setSuccess('A/B test created successfully');
      } catch (err) {
        console.error('Create AB test failed', err);
        setError('Failed to create A/B test');
      }
    })();
  };

  const handleStartTest = (testId: string) => {
    (async () => {
      try {
        await axios.post(`/api/avatars/ab-tests/${testId}/start`);
        await loadTests();
        setSuccess('A/B test started');
      } catch (err) {
        console.error('Start AB test failed', err);
        setError('Failed to start A/B test');
      }
    })();
  };

  const handleStopTest = (testId: string) => {
    (async () => {
      try {
        await axios.post(`/api/avatars/ab-tests/${testId}/stop`);
        await loadTests();
        setSuccess('A/B test stopped');
      } catch (err) {
        console.error('Stop AB test failed', err);
        setError('Failed to stop A/B test');
      }
    })();
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
    // use metrics if available
    const m = test.metrics || {};
    const convA = Number(m.conversations_a || 0);
    const convB = Number(m.conversations_b || 0);
    if (convA === 0 && convB === 0) return 'No data yet';
    const satA = Number(m.satisfaction_a || 0);
    const satB = Number(m.satisfaction_b || 0);
    const scoreA = satA * convA;
    const scoreB = satB * convB;
    if (scoreA > scoreB) return `Avatar A (${test.avatar_a_id || 'N/A'})`;
    if (scoreB > scoreA) return `Avatar B (${test.avatar_b_id || 'N/A'})`;
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
                      label={test.is_active ? 'active' : 'completed'}
                      color={getStatusColor(test.is_active ? 'active' : 'completed')}
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
                  {!test.is_active && (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStartTest(test.id)}
                    >
                      Start
                    </Button>
                  )}
                  {test.is_active && (
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
              {test.is_active && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent>
                        {/* Show avatar A preview + name when available */}
                        <Box display="flex" alignItems="center" gap={1}>
                          <img
                            src={avatars.find(x => x.id === test.avatar_a_id)?.preview || ''}
                            alt={avatars.find(x => x.id === test.avatar_a_id)?.name || 'A'}
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                          />
                          <Typography variant="subtitle2" color="textSecondary">
                            {avatars.find(x => x.id === test.avatar_a_id)?.name || `Avatar A (${test.avatar_a_id || 'N/A'})`}
                          </Typography>
                        </Box>

                        <Typography variant="h6">
                          {test.metrics?.conversations_a || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          conversations
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {(test.metrics?.satisfaction_a || 0).toFixed(1)}
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
                        {/* Show avatar B preview + name when available */}
                        <Box display="flex" alignItems="center" gap={1}>
                          <img
                            src={avatars.find(x => x.id === test.avatar_b_id)?.preview || ''}
                            alt={avatars.find(x => x.id === test.avatar_b_id)?.name || 'B'}
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                          />
                          <Typography variant="subtitle2" color="textSecondary">
                            {avatars.find(x => x.id === test.avatar_b_id)?.name || `Avatar B (${test.avatar_b_id || 'N/A'})`}
                          </Typography>
                        </Box>

                        <Typography variant="h6">
                          {test.metrics?.conversations_b || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          conversations
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {(test.metrics?.satisfaction_b || 0).toFixed(1)}
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
                          value={(test.metrics?.satisfaction_a || 0) * 20}
                          sx={{ mb: 1 }}
                        />
                        <LinearProgress
                          variant="determinate"
                          value={(test.metrics?.satisfaction_b || 0) * 20}
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
                value={newTest.avatar_a_id}
                onChange={(e) => setNewTest({ ...newTest, avatar_a_id: e.target.value })}
              >
                {avatars.map((avatar) => (
                  <MenuItem key={avatar.id} value={avatar.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <img src={avatar.preview} alt={avatar.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                      <span>{avatar.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Avatar B</InputLabel>
              <Select
                value={newTest.avatar_b_id}
                onChange={(e) => setNewTest({ ...newTest, avatar_b_id: e.target.value })}
              >
                {avatars.map((avatar) => (
                  <MenuItem key={avatar.id} value={avatar.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <img src={avatar.preview} alt={avatar.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                      <span>{avatar.name}</span>
                    </Box>
                  </MenuItem>
                ))}
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