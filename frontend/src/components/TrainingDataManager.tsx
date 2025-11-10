import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Add as AddIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface TrainingData {
  id: string;
  category: string;
  intent: string;
  user_input: string;
  avatar_response: string;
  quality_score: number;
  usage_count: number;
}

const TrainingDataManager: React.FC = () => {
  const [trainingData, setTrainingData] = useState<TrainingData[]>([]);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newEntry, setNewEntry] = useState({
    category: '',
    intent: '',
    user_input: '',
    avatar_response: '',
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
    },
    onDrop: (acceptedFiles) => {
      handleFileUpload(acceptedFiles[0]);
    },
  });

  const handleFileUpload = async (file: File) => {
    // Mock file upload - in real implementation would parse and upload to backend
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Mock successful upload
      setSuccess(`Successfully uploaded ${file.name}`);
      setUploadDialog(false);
    } catch (err) {
      setError('Failed to upload file');
    }
  };

  const handleAddEntry = () => {
    // Mock adding entry
    const entry: TrainingData = {
      id: Date.now().toString(),
      ...newEntry,
      quality_score: 0.8,
      usage_count: 0,
    };

    setTrainingData([...trainingData, entry]);
    setAddDialog(false);
    setNewEntry({ category: '', intent: '', user_input: '', avatar_response: '' });
    setSuccess('Training data entry added successfully');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Training Data Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialog(true)}
          >
            Upload Data
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialog(true)}
          >
            Add Entry
          </Button>
        </Box>
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Training Data Entries
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Intent</TableCell>
                <TableCell>User Input</TableCell>
                <TableCell>Avatar Response</TableCell>
                <TableCell>Quality Score</TableCell>
                <TableCell>Usage Count</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trainingData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No training data entries found. Upload a file or add entries manually.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                trainingData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Chip label={entry.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{entry.intent}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.user_input}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.avatar_response}
                    </TableCell>
                    <TableCell>{entry.quality_score.toFixed(2)}</TableCell>
                    <TableCell>{entry.usage_count}</TableCell>
                    <TableCell>
                      <Button size="small" variant="text">
                        Edit
                      </Button>
                      <Button size="small" variant="text" color="error">
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Training Data</DialogTitle>
        <DialogContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the files here...' : 'Drag & drop training data files here'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supported formats: JSON, CSV
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Training Data Entry</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newEntry.category}
                onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
              >
                <MenuItem value="greetings">Greetings</MenuItem>
                <MenuItem value="questions">Questions</MenuItem>
                <MenuItem value="complaints">Complaints</MenuItem>
                <MenuItem value="requests">Requests</MenuItem>
                <MenuItem value="compliments">Compliments</MenuItem>
                <MenuItem value="goodbyes">Goodbyes</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Intent"
              value={newEntry.intent}
              onChange={(e) => setNewEntry({ ...newEntry, intent: e.target.value })}
            />

            <TextField
              fullWidth
              label="User Input"
              multiline
              rows={3}
              value={newEntry.user_input}
              onChange={(e) => setNewEntry({ ...newEntry, user_input: e.target.value })}
            />

            <TextField
              fullWidth
              label="Avatar Response"
              multiline
              rows={3}
              value={newEntry.avatar_response}
              onChange={(e) => setNewEntry({ ...newEntry, avatar_response: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialog(false)}>Cancel</Button>
          <Button onClick={handleAddEntry} variant="contained">
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingDataManager;