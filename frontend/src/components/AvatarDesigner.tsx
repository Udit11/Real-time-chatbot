import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
} from '@mui/material';
import { SketchPicker } from 'react-color';
import { useParams, useNavigate } from 'react-router-dom';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';

interface AvatarData {
  id?: string;
  name: string;
  visual_appearance: {
    face: {
      shape: string;
      skin_tone: string;
    };
    clothing: {
      type: string;
      primary_color: string;
      secondary_color: string;
    };
    style: {
      theme: string;
      border_radius: string;
      background_color: string;
    };
  };
  voice_characteristics: {
    tone: string;
    accent: string;
    speed: number;
    gender: string;
    pitch: number;
  };
  personality_traits: {
    formality: string;
    empathy: number;
    directness: number;
    humor: number;
    enthusiasm: number;
    patience: number;
  };
  animation_behaviors: Array<{
    trigger: string;
    animation: string;
  }>;
  branding_elements: {
    logo_url: string;
    background_color: string;
    theme_colors: string[];
    font_family: string;
    company_name: string;
  };
}

const AvatarDesigner: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const [avatarData, setAvatarData] = useState<AvatarData>({
    name: '',
    visual_appearance: {
      face: {
        shape: 'round',
        skin_tone: '#8B7355',
      },
      clothing: {
        type: 'business_casual',
        primary_color: '#2C5F8D',
        secondary_color: '#5CA3D5',
      },
      style: {
        theme: 'professional',
        border_radius: '12px',
        background_color: '#FFFFFF',
      },
    },
    voice_characteristics: {
      tone: 'warm_friendly',
      accent: 'neutral_american',
      speed: 1.0,
      gender: 'female',
      pitch: 0,
    },
    personality_traits: {
      formality: 'professional',
      empathy: 0.8,
      directness: 0.6,
      humor: 0.3,
      enthusiasm: 0.7,
      patience: 0.9,
    },
    animation_behaviors: [
      { trigger: 'greeting', animation: 'wave_hand' },
      { trigger: 'thinking', animation: 'head_tilt' },
      { trigger: 'empathy', animation: 'nod_slowly' },
      { trigger: 'excited', animation: 'bounce' },
      { trigger: 'neutral', animation: 'idle_blink' },
    ],
    branding_elements: {
      logo_url: '',
      background_color: '#FFFFFF',
      theme_colors: ['#2C5F8D', '#5CA3D5', '#A8D0E6'],
      font_family: 'Inter, sans-serif',
      company_name: '',
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      loadAvatar(id);
    }
  }, [id]);

  const loadAvatar = async (avatarId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/avatars/${avatarId}`);
      setAvatarData(response.data);
    } catch (err) {
      setError('Failed to load avatar configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveAvatar = async () => {
    try {
      setLoading(true);
      setError(null);

      if (id && id !== 'new') {
        await axios.put(`/api/avatars/${id}`, avatarData);
        setSuccess('Avatar updated successfully');
      } else {
        const response = await axios.post('/api/avatars/', avatarData);
        navigate(`/avatars/${response.data.id}`);
        setSuccess('Avatar created successfully');
      }
    } catch (err) {
      setError('Failed to save avatar configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color: any, path: string) => {
    const keys = path.split('.');
    setAvatarData((prev) => {
      const updated = { ...prev };
      let current: any = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = color.hex;
      return updated;
    });
  };

  const renderColorPicker = (color: string, path: string, label: string) => (
    <Box mb={2}>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Box display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            width: 40,
            height: 40,
            backgroundColor: color,
            border: '1px solid #ddd',
            borderRadius: 1,
            cursor: 'pointer',
          }}
          onClick={() => setShowColorPicker(showColorPicker === path ? null : path)}
        />
        <Typography variant="body2">{color}</Typography>
      </Box>
      {showColorPicker === path && (
        <Box mt={1}>
          <SketchPicker
            color={color}
            onChange={(color) => handleColorChange(color, path)}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/avatars')}
        >
          Back to Avatars
        </Button>
        <Typography variant="h4" component="h1">
          {id === 'new' ? 'Create Avatar' : 'Edit Avatar'}
        </Typography>
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
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <TextField
              fullWidth
              label="Avatar Name"
              value={avatarData.name}
              onChange={(e) => setAvatarData({ ...avatarData, name: e.target.value })}
              margin="normal"
            />
          </Paper>
        </Grid>

        {/* Visual Appearance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Visual Appearance
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Face Shape</InputLabel>
              <Select
                value={avatarData.visual_appearance.face.shape}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    visual_appearance: {
                      ...avatarData.visual_appearance,
                      face: {
                        ...avatarData.visual_appearance.face,
                        shape: e.target.value,
                      },
                    },
                  })
                }
              >
                <MenuItem value="round">Round</MenuItem>
                <MenuItem value="oval">Oval</MenuItem>
                <MenuItem value="square">Square</MenuItem>
                <MenuItem value="heart">Heart</MenuItem>
              </Select>
            </FormControl>

            {renderColorPicker(
              avatarData.visual_appearance.face.skin_tone,
              'visual_appearance.face.skin_tone',
              'Skin Tone'
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Clothing Type</InputLabel>
              <Select
                value={avatarData.visual_appearance.clothing.type}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    visual_appearance: {
                      ...avatarData.visual_appearance,
                      clothing: {
                        ...avatarData.visual_appearance.clothing,
                        type: e.target.value,
                      },
                    },
                  })
                }
              >
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="business_casual">Business Casual</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="formal">Formal</MenuItem>
              </Select>
            </FormControl>

            {renderColorPicker(
              avatarData.visual_appearance.clothing.primary_color,
              'visual_appearance.clothing.primary_color',
              'Primary Color'
            )}

            {renderColorPicker(
              avatarData.visual_appearance.clothing.secondary_color,
              'visual_appearance.clothing.secondary_color',
              'Secondary Color'
            )}
          </Paper>
        </Grid>

        {/* Voice Characteristics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Voice Characteristics
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Tone</InputLabel>
              <Select
                value={avatarData.voice_characteristics.tone}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    voice_characteristics: {
                      ...avatarData.voice_characteristics,
                      tone: e.target.value,
                    },
                  })
                }
              >
                <MenuItem value="warm_friendly">Warm & Friendly</MenuItem>
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="energetic">Energetic</MenuItem>
                <MenuItem value="calm">Calm</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Accent</InputLabel>
              <Select
                value={avatarData.voice_characteristics.accent}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    voice_characteristics: {
                      ...avatarData.voice_characteristics,
                      accent: e.target.value,
                    },
                  })
                }
              >
                <MenuItem value="neutral_american">Neutral American</MenuItem>
                <MenuItem value="british">British</MenuItem>
                <MenuItem value="australian">Australian</MenuItem>
                <MenuItem value="indian">Indian</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Gender</InputLabel>
              <Select
                value={avatarData.voice_characteristics.gender}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    voice_characteristics: {
                      ...avatarData.voice_characteristics,
                      gender: e.target.value,
                    },
                  })
                }
              >
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="neutral">Neutral</MenuItem>
              </Select>
            </FormControl>

            <Box mt={2}>
              <Typography gutterBottom>Speaking Speed: {avatarData.voice_characteristics.speed}</Typography>
              <Slider
                value={avatarData.voice_characteristics.speed}
                onChange={(_, value) =>
                  setAvatarData({
                    ...avatarData,
                    voice_characteristics: {
                      ...avatarData.voice_characteristics,
                      speed: value as number,
                    },
                  })
                }
                min={0.5}
                max={2.0}
                step={0.1}
                marks={[
                  { value: 0.5, label: 'Slow' },
                  { value: 1.0, label: 'Normal' },
                  { value: 2.0, label: 'Fast' },
                ]}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Personality Traits */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personality Traits
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Formality</InputLabel>
              <Select
                value={avatarData.personality_traits.formality}
                onChange={(e) =>
                  setAvatarData({
                    ...avatarData,
                    personality_traits: {
                      ...avatarData.personality_traits,
                      formality: e.target.value,
                    },
                  })
                }
              >
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="formal">Formal</MenuItem>
                <MenuItem value="friendly">Friendly</MenuItem>
              </Select>
            </FormControl>

            {[
              { label: 'Empathy', key: 'empathy' },
              { label: 'Directness', key: 'directness' },
              { label: 'Humor', key: 'humor' },
              { label: 'Enthusiasm', key: 'enthusiasm' },
              { label: 'Patience', key: 'patience' },
            ].map((trait) => (
              <Box key={trait.key} mt={2}>
                <Typography gutterBottom>
                  {trait.label}: {avatarData.personality_traits[trait.key as keyof typeof avatarData.personality_traits]}
                </Typography>
                <Slider
                  value={avatarData.personality_traits[trait.key as keyof typeof avatarData.personality_traits] as number}
                  onChange={(_, value) =>
                    setAvatarData({
                      ...avatarData,
                      personality_traits: {
                        ...avatarData.personality_traits,
                        [trait.key]: value,
                      },
                    })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Low' },
                    { value: 0.5, label: 'Medium' },
                    { value: 1, label: 'High' },
                  ]}
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Branding Elements */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Branding Elements
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={avatarData.branding_elements.company_name}
                  onChange={(e) =>
                    setAvatarData({
                      ...avatarData,
                      branding_elements: {
                        ...avatarData.branding_elements,
                        company_name: e.target.value,
                      },
                    })
                  }
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Logo URL"
                  value={avatarData.branding_elements.logo_url}
                  onChange={(e) =>
                    setAvatarData({
                      ...avatarData,
                      branding_elements: {
                        ...avatarData.branding_elements,
                        logo_url: e.target.value,
                      },
                    })
                  }
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Font Family"
                  value={avatarData.branding_elements.font_family}
                  onChange={(e) =>
                    setAvatarData({
                      ...avatarData,
                      branding_elements: {
                        ...avatarData.branding_elements,
                        font_family: e.target.value,
                      },
                    })
                  }
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                {renderColorPicker(
                  avatarData.branding_elements.background_color,
                  'branding_elements.background_color',
                  'Background Color'
                )}

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Theme Colors
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {avatarData.branding_elements.theme_colors.map((color, index) => (
                    <Chip
                      key={index}
                      label={color}
                      style={{ backgroundColor: color, color: 'white' }}
                      onDelete={() => {
                        const newColors = [...avatarData.branding_elements.theme_colors];
                        newColors.splice(index, 1);
                        setAvatarData({
                          ...avatarData,
                          branding_elements: {
                            ...avatarData.branding_elements,
                            theme_colors: newColors,
                          },
                        });
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveAvatar}
              disabled={loading}
            >
              {loading ? 'Saving...' : id === 'new' ? 'Create Avatar' : 'Save Changes'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AvatarDesigner;