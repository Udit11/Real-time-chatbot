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
  Avatar,
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
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Avatar {
  id: string;
  name: string;
  visual_appearance: {
    face: {
      skin_tone: string;
    };
    clothing: {
      primary_color: string;
      secondary_color: string;
    };
  };
  voice_characteristics: {
    tone: string;
    gender: string;
  };
  personality_traits: {
    formality: string;
  };
  branding_elements: {
    company_name: string;
    theme_colors: string[];
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
      setOperationMessage({ type: 'success', text: 'Avatar deleted successfully' });
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
      setOperationMessage({ type: 'success', text: `Avatar "${avatar.name}" cloned successfully` });
    } catch (err) {
      setError('Failed to clone avatar');
    }
  };

  // Open full preview passing the entire avatar object as an encoded "config" param.
  const openPreviewWithConfig = (avatar: Avatar) => {
    try {
      // Ensure voice_characteristics has gender field (fallback to 'female' if missing)
      const vc = avatar.voice_characteristics as any || {};
      
      // Extract gender - prioritize from voice_characteristics, then check root level
      const gender = vc.gender || (avatar as any).gender || 'female';
      
      const completeAvatar = {
        ...avatar,
        voice_characteristics: {
          tone: vc.tone || 'warm_friendly',
          accent: vc.accent || 'neutral_american',
          speed: vc.speed || 1,
          gender: gender, // Ensure gender exists
          pitch: vc.pitch || 0,
        },
      };

      console.log('=== PREVIEW CONFIG DEBUG ===');
      console.log('[openPreviewWithConfig] Original avatar:', avatar);
      console.log('[openPreviewWithConfig] Avatar to encode:', completeAvatar);
      console.log('[openPreviewWithConfig] Gender being sent:', completeAvatar.voice_characteristics.gender);
      console.log('[openPreviewWithConfig] Full voice_characteristics:', completeAvatar.voice_characteristics);

      const json = JSON.stringify(completeAvatar);
      console.log('[openPreviewWithConfig] JSON string:', json);
      
      // Encode UTF-8 safely to base64
      const encoded = btoa(unescape(encodeURIComponent(json)));
      const url = `/chat-widget/index.html?config=${encodeURIComponent(encoded)}`;
      console.log('[openPreviewWithConfig] Opening preview with URL (first 200 chars):', url.substring(0, 200));
      console.log('[openPreviewWithConfig] Encoded config length:', encoded.length);
      console.log('[openPreviewWithConfig] Full encoded config:', encoded);
      console.log('=== END DEBUG ===');
      
      window.open(url, '_blank');
    } catch (err) {
      // fallback to avatar_id preview
      console.warn('Failed to encode avatar config, falling back to avatar_id preview', err);
      window.open(`/chat-widget/index.html?avatar_id=${avatar.id}`, '_blank');
    }
  };

  const getStatusColor = (isActive: boolean) => (isActive ? 'success' : 'default');

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '🤖';
    }
  };

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
      setOperationMessage({ type: 'success', text: 'Version snapshot saved' });
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

      setOperationMessage({ type: 'success', text: 'Successfully reverted to selected version' });
      closePreview();
      closeVersionsDialog();
    } catch (err) {
      setOperationMessage({ type: 'error', text: 'Failed to revert to version' });
    }
  };

  // --- End version control ---

  // Generate a compact inline SVG avatar data URI (used when no logo image provided)
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

  const renderAvatarPreview = (avatar: Avatar) => {
    const primaryColor = avatar.visual_appearance?.clothing?.primary_color || '#667eea';
    const secondaryColor = avatar.visual_appearance?.clothing?.secondary_color || '#764ba2';
    const skinTone = avatar.visual_appearance?.face?.skin_tone || '#8B7355';
    // Prefer saved logo image if provided, otherwise generate inline SVG
    const imageSrc = avatar.branding_elements?.company_name && avatar.branding_elements?.company_name.length && avatar.branding_elements?.theme_colors
      ? (avatar.branding_elements && (avatar as any).branding_elements.logo_url ? (avatar as any).branding_elements.logo_url : generateInlineAvatarSVG(skinTone, primaryColor, secondaryColor, avatar.voice_characteristics?.gender || 'neutral'))
      : ( (avatar as any).branding_elements?.logo_url ? (avatar as any).branding_elements.logo_url : generateInlineAvatarSVG(skinTone, primaryColor, secondaryColor, avatar.voice_characteristics?.gender || 'neutral'));

    return (
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '48px',
          position: 'relative',
          flexShrink: 0,
          boxShadow: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: `linear-gradient(to top, ${primaryColor}, transparent)`,
          }}
        />
        <img
          src={imageSrc}
          alt={`${avatar.name} avatar`}
          style={{
            width: 64,
            height: 64,
            borderRadius: 8,
            objectFit: 'cover',
            zIndex: 1,
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)'
          }}
        />
        {avatar.branding_elements?.theme_colors && avatar.branding_elements.theme_colors.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 0.5,
            }}
          >
            {avatar.branding_elements.theme_colors.slice(0, 3).map((color, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '1px solid rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Avatar Gallery
          </Typography>
          <Typography variant="body2" color="textSecondary" mt={0.5}>
            Create and manage your AI avatars with custom appearances and personalities
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={() => navigate('/avatars/new')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Create New Avatar
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
                minHeight: 140,
                maxWidth: 1200,
                margin: '0 auto',
                boxShadow: 2,
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', flex: 1, p: 3 }}>
                {renderAvatarPreview(avatar)}

                <Box sx={{ flex: 1, ml: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h5" component="h2" fontWeight={600}>
                      {avatar.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={avatar.is_active ? 'Active' : 'Inactive'}
                      color={getStatusColor(avatar.is_active)}
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>

                  {avatar.branding_elements?.company_name && (
                    <Typography variant="body2" color="primary" fontWeight={600} mb={1}>
                      {avatar.branding_elements.company_name}
                    </Typography>
                  )}

                  <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                      icon={<span>🎙️</span>}
                      size="small"
                      label={`${avatar.voice_characteristics?.gender || 'neutral'} voice`}
                      variant="outlined"
                    />
                    <Chip
                      icon={<span>💬</span>}
                      size="small"
                      label={avatar.voice_characteristics?.tone?.replace('_', ' ') || 'warm friendly'}
                      variant="outlined"
                    />
                    <Chip
                      icon={<span>✨</span>}
                      size="small"
                      label={avatar.personality_traits?.formality || 'professional'}
                      variant="outlined"
                    />
                    {avatar.branding_elements?.theme_colors && avatar.branding_elements.theme_colors.length > 0 && (
                      <Chip
                        icon={<PaletteIcon sx={{ fontSize: 16 }} />}
                        size="small"
                        label={`${avatar.branding_elements.theme_colors.length} theme colors`}
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Box mt={1.5}>
                    <Typography variant="caption" color="textSecondary">
                      Created: {new Date(avatar.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>

              <CardActions sx={{ pr: 2, gap: 0.5 }}>
                <Tooltip title="Edit Avatar">
                  <IconButton
                    size="medium"
                    onClick={() => navigate(`/avatars/${avatar.id}`)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Clone Avatar">
                  <IconButton
                    size="medium"
                    onClick={() => handleClone(avatar)}
                    color="primary"
                  >
                    <CloneIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Preview in Chat">
                  <IconButton
                    size="medium"
                    onClick={() => openPreviewWithConfig(avatar)}
                    color="primary"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Version History">
                  <IconButton
                    size="medium"
                    onClick={() => openVersionsDialog(avatar.id)}
                    color="primary"
                  >
                    <VersionsIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Avatar">
                  <IconButton
                    size="medium"
                    onClick={() => setDeleteDialog({ open: true, avatarId: avatar.id })}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {avatars.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
              }}
            >
              <Box fontSize="64px" mb={2}>
                🤖
              </Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                No avatars found
              </Typography>
              <Typography variant="body1" color="textSecondary" gutterBottom mb={3}>
                Create your first avatar to get started with the chatbot system.
                <br />
                Customize appearance, voice, personality, and branding elements.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/avatars/new')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                }}
              >
                Create Your First Avatar
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
          bottom: 24,
          right: 24,
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
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Avatar</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this avatar? This action cannot be undone and will remove all associated configurations and chat history.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, avatarId: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete Avatar
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
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <VersionsIcon />
            Version History
          </Box>
        </DialogTitle>
        <DialogContent>
          {versionsDialog.avatarId ? (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={3} p={2} bgcolor="grey.50" borderRadius={2}>
                <TextField
                  label="Snapshot Description"
                  fullWidth
                  value={saveVersionMessage}
                  onChange={(e) => setSaveVersionMessage(e.target.value)}
                  placeholder="e.g., 'Updated voice characteristics' or 'New branding colors'"
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={() => saveSnapshot(versionsDialog.avatarId!)}
                  sx={{ minWidth: 140 }}
                >
                  Save Snapshot
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List>
                {versionsMap[versionsDialog.avatarId]?.length ? (
                  versionsMap[versionsDialog.avatarId].map((v, idx) => (
                    <React.Fragment key={v.id}>
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          borderRadius: 2,
                          '&:hover': { bgcolor: 'grey.50' },
                          mb: 1,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {v.message || `Version ${idx + 1}`}
                              </Typography>
                              {idx === 0 && (
                                <Chip label="Latest" size="small" color="primary" />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="textSecondary">
                              {new Date(v.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {v.author && ` • ${v.author}`}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Button
                            size="small"
                            onClick={() => previewVersion(v)}
                            sx={{ mr: 1 }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RevertIcon />}
                            onClick={() => revertToVersion(versionsDialog.avatarId!, v.id)}
                          >
                            Revert
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))
                ) : (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color="textSecondary">
                      No version history found for this avatar.
                      <br />
                      Create a snapshot to save the current configuration.
                    </Typography>
                  </Paper>
                )}
              </List>
            </>
          ) : (
            <Typography>Loading versions...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeVersionsDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version Preview Dialog */}
      <Dialog
        open={selectedPreview.open}
        onClose={closePreview}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <VisibilityIcon />
            Version Preview
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPreview.version ? (
            <Box
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                maxHeight: '60vh',
                overflow: 'auto',
                bgcolor: 'grey.900',
                color: 'grey.100',
                p: 2,
                borderRadius: 2,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}
            >
              {JSON.stringify(selectedPreview.version.snapshot ?? selectedPreview.version, null, 2)}
            </Box>
          ) : (
            <Typography>No preview available</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closePreview}>Close</Button>
          {selectedPreview.version && versionsDialog.avatarId && (
            <Button
              variant="contained"
              startIcon={<RevertIcon />}
              onClick={() => revertToVersion(versionsDialog.avatarId!, selectedPreview.version!.id)}
            >
              Revert to This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvatarList;