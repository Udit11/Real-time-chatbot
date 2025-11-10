// src/components/AvatarList.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Divider,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Visibility as VisibilityIcon,
  History as VersionsIcon,
  Replay as RevertIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Avatar {
  id: string;
  name: string;
  visual_appearance: {
    clothing: {
      primary_color: string;
    };
  };
  voice_characteristics: {
    tone: string;
    gender: string;
  };
  personality_traits: {
    formality: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Version {
  id: string;
  created_at: string;
  author?: string;
  message?: string;
  snapshot?: any;
}

const AvatarList: React.FC = () => {
  const navigate = useNavigate();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; avatarId: string | null }>(
    { open: false, avatarId: null }
  );

  // Version control state
  const [versionsDialog, setVersionsDialog] = useState<{ open: boolean; avatarId: string | null }>({
    open: false,
    avatarId: null,
  });
  const [versionsMap, setVersionsMap] = useState<Record<string, Version[]>>({});
  const [selectedPreview, setSelectedPreview] = useState<{ version?: Version; open: boolean }>({
    version: undefined,
    open: false,
  });
  const [saveVersionMessage, setSaveVersionMessage] = useState<string>('');
  const [operationMessage, setOperationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/avatars/');
      setAvatars(response.data);
    } catch (err) {
      setError('Failed to load avatars');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.avatarId) return;

    try {
      await axios.delete(`/api/avatars/${deleteDialog.avatarId}`);
      setAvatars((prev) => prev.filter((avatar) => avatar.id !== deleteDialog.avatarId));
      setDeleteDialog({ open: false, avatarId: null });
      setOperationMessage({ type: 'success', text: 'Avatar deleted' });
    } catch (err) {
      setError('Failed to delete avatar');
    }
  };

  const handleClone = async (avatar: Avatar) => {
    try {
      const response = await axios.post(`/api/avatars/${avatar.id}/clone`, {
        new_name: `${avatar.name} (Clone)`,
      });
      setAvatars((prev) => [...prev, response.data]);
      setOperationMessage({ type: 'success', text: 'Avatar cloned' });
    } catch (err) {
      setError('Failed to clone avatar');
    }
  };

  const getStatusColor = (isActive: boolean) => (isActive ? 'success' : 'default');

  // --- Version control functions ---
  const openVersionsDialog = async (avatarId: string) => {
    setVersionsDialog({ open: true, avatarId });
    // load versions if not loaded yet
    if (!versionsMap[avatarId]) {
      try {
        const res = await axios.get(`/api/avatars/${avatarId}/versions`);
        setVersionsMap((prev) => ({ ...prev, [avatarId]: res.data }));
      } catch (err) {
        setOperationMessage({ type: 'error', text: 'Failed to load versions' });
      }
    }
  };

  const closeVersionsDialog = () => {
    setVersionsDialog({ open: false, avatarId: null });
    setSelectedPreview({ version: undefined, open: false });
    setSaveVersionMessage('');
  };

  const saveSnapshot = async (avatarId: string) => {
    try {
      const res = await axios.post(`/api/avatars/${avatarId}/versions`, {
        message: saveVersionMessage || `Snapshot at ${new Date().toISOString()}`,
      });
      // update versions map
      setVersionsMap((prev) => {
        const updated = { ...(prev || {}) };
        updated[avatarId] = updated[avatarId] ? [res.data, ...updated[avatarId]] : [res.data];
        return updated;
      });
      setSaveVersionMessage('');
      setOperationMessage({ type: 'success', text: 'Version saved' });
    } catch (err) {
      setOperationMessage({ type: 'error', text: 'Failed to save version' });
    }
  };

  const previewVersion = (version: Version) => {
    setSelectedPreview({ version, open: true });
  };

  const closePreview = () => {
    setSelectedPreview({ version: undefined, open: false });
  };

  const revertToVersion = async (avatarId: string, versionId: string) => {
    try {
      // server should perform the revert and return the updated avatar
      const res = await axios.post(`/api/avatars/${avatarId}/revert`, { version_id: versionId });
      const updatedAvatar = res.data;

      // update avatars list with the returned avatar
      setAvatars((prev) => prev.map((a) => (a.id === updatedAvatar.id ? updatedAvatar : a)));

      // Optionally refresh versions list for that avatar
      try {
        const versionsRes = await axios.get(`/api/avatars/${avatarId}/versions`);
        setVersionsMap((prev) => ({ ...prev, [avatarId]: versionsRes.data }));
      } catch {
        // non-fatal
      }

      setOperationMessage({ type: 'success', text: 'Reverted to selected version' });
      closePreview();
      closeVersionsDialog();
    } catch (err) {
      setOperationMessage({ type: 'error', text: 'Failed to revert to version' });
    }
  };

  // --- End version control ---

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Avatars
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/avatars/new')}
        >
          Create Avatar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {operationMessage && (
        <Alert
          severity={operationMessage.type === 'success' ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setOperationMessage(null)}
        >
          {operationMessage.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {avatars.map((avatar) => (
          <Grid item xs={12} key={avatar.id}>
            <Card
              sx={{
                display: 'flex',
                alignItems: 'center',
                minHeight: 120,
                maxWidth: 1000,
                margin: '0 auto',
                boxShadow: 3,
                borderRadius: 2,
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '12px',
                    backgroundColor: avatar.visual_appearance?.clothing?.primary_color || '#777',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '32px',
                    mr: 2,
                    flexShrink: 0,
                  }}
                >
                  🤖
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" component="h2">
                    {avatar.name}
                  </Typography>

                  <Box display="flex" gap={2} alignItems="center" sx={{ mt: 0.5 }}>
                    <Chip size="small" label={avatar.is_active ? 'Active' : 'Inactive'} color={getStatusColor(avatar.is_active)} />
                    <Typography variant="body2" color="textSecondary">
                      Voice: {avatar.voice_characteristics.gender} • {avatar.voice_characteristics.tone.replace('_', ' ')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Style: {avatar.personality_traits.formality}
                    </Typography>
                  </Box>

                  <Box mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      Created: {new Date(avatar.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>

              <CardActions sx={{ pr: 2 }}>
                <IconButton
                  size="small"
                  onClick={() => navigate(`/avatars/${avatar.id}`)}
                  title="Edit"
                >
                  <EditIcon />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => handleClone(avatar)}
                  title="Clone"
                >
                  <CloneIcon />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => setDeleteDialog({ open: true, avatarId: avatar.id })}
                  title="Delete"
                >
                  <DeleteIcon />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={() => window.open(`/chat-widget/index.html?avatar_id=${avatar.id}`, '_blank')}
                  title="Preview"
                >
                  <VisibilityIcon />
                </IconButton>

                {/* Version control actions */}
                <Tooltip title="Save Version">
                  <IconButton
                    size="small"
                    onClick={() => openVersionsDialog(avatar.id)}
                    title="Versions"
                  >
                    <VersionsIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {avatars.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No avatars found
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Create your first avatar to get started with the chatbot system.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/avatars/new')}
                sx={{ mt: 2 }}
              >
                Create Avatar
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={() => navigate('/avatars/new')}
      >
        <AddIcon />
      </Fab>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, avatarId: null })}
      >
        <DialogTitle>Delete Avatar</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this avatar? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, avatarId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog
        open={versionsDialog.open}
        onClose={closeVersionsDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Versions</DialogTitle>
        <DialogContent>
          {versionsDialog.avatarId ? (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <TextField
                  label="Snapshot message (optional)"
                  fullWidth
                  value={saveVersionMessage}
                  onChange={(e) => setSaveVersionMessage(e.target.value)}
                  placeholder="Describe this snapshot (e.g., 'Post onboarding changes')"
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => saveSnapshot(versionsDialog.avatarId!)}
                >
                  Save Snapshot
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List>
                {versionsMap[versionsDialog.avatarId]?.length ? (
                  versionsMap[versionsDialog.avatarId].map((v) => (
                    <React.Fragment key={v.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={
                            v.message ? v.message : `Version ${v.id}`
                          }
                          secondary={`Created: ${new Date(v.created_at).toLocaleString()}${v.author ? ` • ${v.author}` : ''}`}
                        />
                        <ListItemSecondaryAction>
                          <Button size="small" onClick={() => previewVersion(v)}>Preview</Button>
                          <Button
                            size="small"
                            startIcon={<RevertIcon />}
                            onClick={() => revertToVersion(versionsDialog.avatarId!, v.id)}
                          >
                            Revert
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))
                ) : (
                  <Typography color="textSecondary" sx={{ p: 2 }}>
                    No versions found for this avatar.
                  </Typography>
                )}
              </List>
            </>
          ) : (
            <Typography>Loading...</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeVersionsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog
        open={selectedPreview.open}
        onClose={closePreview}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Version Preview</DialogTitle>
        <DialogContent>
          {selectedPreview.version ? (
            <Box component="pre" sx={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto' }}>
              {JSON.stringify(selectedPreview.version.snapshot ?? selectedPreview.version, null, 2)}
            </Box>
          ) : (
            <Typography>No preview available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePreview}>Close</Button>
          {selectedPreview.version && versionsDialog.avatarId && (
            <Button
              variant="contained"
              startIcon={<RevertIcon />}
              onClick={() => revertToVersion(versionsDialog.avatarId!, selectedPreview.version!.id)}
            >
              Revert to this version
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvatarList;
