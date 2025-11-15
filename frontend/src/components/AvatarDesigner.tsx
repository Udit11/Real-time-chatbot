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
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { SketchPicker } from 'react-color';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  Close as CloseIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
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
  const [newThemeColor, setNewThemeColor] = useState('#667eea');
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);

  // Live preview state
  const [previewAnimating, setPreviewAnimating] = useState(false);
  const [sampleText, setSampleText] = useState<string>('Hello! This is a quick sample from your avatar.');

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

  const defaultAvatarTemplate: AvatarData = {
    name: '',
    visual_appearance: {
      face: { shape: 'round', skin_tone: '#8B7355' },
      clothing: { type: 'business_casual', primary_color: '#2C5F8D', secondary_color: '#5CA3D5' },
      style: { theme: 'professional', border_radius: '12px', background_color: '#FFFFFF' }
    },
    voice_characteristics: { tone: 'warm_friendly', accent: 'neutral_american', speed: 1.0, gender: 'female', pitch: 0 },
    personality_traits: { formality: 'professional', empathy: 0.8, directness: 0.6, humor: 0.3, enthusiasm: 0.7, patience: 0.9 },
    animation_behaviors: [
      { trigger: 'greeting', animation: 'wave_hand' },
      { trigger: 'thinking', animation: 'head_tilt' },
      { trigger: 'empathy', animation: 'nod_slowly' },
      { trigger: 'excited', animation: 'bounce' },
      { trigger: 'neutral', animation: 'idle_blink' }
    ],
    branding_elements: { logo_url: '', background_color: '#FFFFFF', theme_colors: ['#2C5F8D', '#5CA3D5', '#A8D0E6'], font_family: 'Inter, sans-serif', company_name: '' }
  };

  // Helper to merge server-provided avatar with defaults so UI bindings are always present
  const withDefaults = (data: Partial<AvatarData> | any): AvatarData => {
    const merged: AvatarData = {
      ...defaultAvatarTemplate,
      ...(data || {})
    };
    merged.visual_appearance = {
      ...defaultAvatarTemplate.visual_appearance,
      ...(data?.visual_appearance || {})
    };
    merged.visual_appearance.face = {
      ...defaultAvatarTemplate.visual_appearance.face,
      ...(data?.visual_appearance?.face || {})
    };
    merged.visual_appearance.clothing = {
      ...defaultAvatarTemplate.visual_appearance.clothing,
      ...(data?.visual_appearance?.clothing || {})
    };
    merged.visual_appearance.style = {
      ...defaultAvatarTemplate.visual_appearance.style,
      ...(data?.visual_appearance?.style || {})
    };
    merged.voice_characteristics = {
      ...defaultAvatarTemplate.voice_characteristics,
      ...(data?.voice_characteristics || {})
    };
    merged.personality_traits = {
      ...defaultAvatarTemplate.personality_traits,
      ...(data?.personality_traits || {})
    };
    merged.animation_behaviors = (data?.animation_behaviors && data.animation_behaviors.length) ? data.animation_behaviors : defaultAvatarTemplate.animation_behaviors;
    merged.branding_elements = {
      ...defaultAvatarTemplate.branding_elements,
      ...(data?.branding_elements || {})
    };
    return merged;
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadAvatar(id);
    }
  }, [id]);

  const loadAvatar = async (avatarId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/avatars/${avatarId}`);
      // merge with defaults so UI fields exist even if backend omitted some keys
      setAvatarData(withDefaults(response.data));
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
      // Ensure payload has all required sections (merge defaults)
      const payload = withDefaults(avatarData);

      if (id && id !== 'new') {
        await axios.put(`/api/avatars/${id}`, payload);
        setSuccess('Avatar updated successfully');
      } else {
        const response = await axios.post('/api/avatars/', payload);
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

  const addThemeColor = () => {
    if (avatarData.branding_elements.theme_colors.length >= 5) {
      setError('Maximum 5 theme colors allowed');
      return;
    }
    setAvatarData({
      ...avatarData,
      branding_elements: {
        ...avatarData.branding_elements,
        theme_colors: [...avatarData.branding_elements.theme_colors, newThemeColor],
      },
    });
    setNewThemeColor('#667eea');
  };

  const removeThemeColor = (index: number) => {
    const newColors = [...avatarData.branding_elements.theme_colors];
    newColors.splice(index, 1);
    setAvatarData({
      ...avatarData,
      branding_elements: {
        ...avatarData.branding_elements,
        theme_colors: newColors,
      },
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
            width: 50,
            height: 50,
            backgroundColor: color,
            border: '2px solid #ddd',
            borderRadius: 2,
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
          onClick={() => setShowColorPicker(showColorPicker === path ? null : path)}
        />
        <Typography variant="body2" fontFamily="monospace">
          {color}
        </Typography>
      </Box>
      {showColorPicker === path && (
        <Box mt={1} position="relative">
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            onClick={() => setShowColorPicker(null)}
          />
          <Box position="relative" zIndex={2}>
            <SketchPicker
              color={color}
              onChange={(color) => handleColorChange(color, path)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  const previewAvatar = () => {
    if (id && id !== 'new') {
      window.open(`/chat-widget/index.html?avatar_id=${id}`, '_blank');
    } else {
      setError('Please save the avatar first before previewing');
    }
  };

  const openLivePreview = () => {
    setLivePreviewOpen(true);
  };

  const closeLivePreview = () => {
    setLivePreviewOpen(false);
  };

  // Improved human-like SVG avatar (small, professional, gender-aware)
  const AvatarGraphic: React.FC<{
    size?: number;
    skinTone: string;
    primary: string;
    secondary: string;
    faceShape?: string;
    gender?: string;
  }> = ({ size = 120, skinTone, primary, secondary, faceShape = 'round', gender = 'neutral' }) => {
    const width = size;
    const height = Math.round(size * 1.1);

    // hair color / style by gender
    const hairColor = gender === 'male' ? '#1f2937' : gender === 'female' ? '#3b2f2f' : '#4b5563';
    const earringColor = '#f6c6c6';

    // face radius adjustments for shapes (keeps proportions smaller/more professional)
    const headRx = faceShape === 'oval' ? 20 : faceShape === 'square' ? 8 : faceShape === 'heart' ? 22 : 14;

    const gradId = `grad-${Math.round(Math.random() * 100000)}`;

    return (
      <svg width={width} height={height} viewBox="0 0 120 132" role="img" aria-label="Avatar preview">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>

        {/* torso with subtle V-neck */}
        <path d="M14 78 h92 v34 a10 10 0 0 1 -10 10 h-72 a10 10 0 0 1 -10 -10 z" fill={`url(#${gradId})`} />

        {/* neck */}
        <rect x="50" y="60" width="20" height="12" rx="2.5" fill={skinTone} />

        {/* head (smaller inside canvas to look more like an icon) */}
        <rect x="28" y="12" width="64" height="64" rx={headRx} fill={skinTone} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />

        {/* gender hair styles */}
        {gender === 'female' ? (
          <>
            {/* long side hair + soft bangs */}
            <path d="M28 34 C30 22, 36 18, 60 22 C84 18, 90 22, 92 34 L92 34 C88 44, 88 70, 74 78 C64 84, 46 84, 36 78 C22 70,22 44,28 34 Z" fill={hairColor} />
            {/* small earring */}
            <circle cx="24" cy="56" r="2.6" fill={earringColor} />
          </>
        ) : gender === 'male' ? (
          <>
            {/* short cropped hair */}
            <path d="M30 28 C38 18, 82 18, 90 28 L90 28 C84 26, 70 22, 60 24 C50 22,36 26,30 28 Z" fill={hairColor} />
            {/* short side hair hint */}
            <path d="M28 36 C30 32, 34 30, 38 30" fill={hairColor} opacity="0.7" />
          </>
        ) : (
          <>
            {/* neutral slick hair */}
            <path d="M30 26 C40 16,80 16,90 26 C84 22,72 20,60 22 C48 20,36 22,30 26 Z" fill={hairColor} />
          </>
        )}

        {/* eyes (slightly human, small) */}
        <ellipse cx="47.5" cy="46" rx="3.2" ry="2.6" fill="#111827" />
        <ellipse cx="72.5" cy="46" rx="3.2" ry="2.6" fill="#111827" />

        {/* eyebrows */}
        <path d="M42 40 q6 -4 12 0" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M66 40 q6 -4 12 0" stroke="rgba(0,0,0,0.5)" strokeWidth="1.4" strokeLinecap="round" fill="none" />

        {/* subtle nose */}
        <path d="M60 50 q2 4 0 6" stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round" fill="none" />

        {/* mouth */}
        <path d="M52 60 q8 6 16 0" stroke="#3b3b3b" strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* blush / cheek highlights */}
        <ellipse cx="40" cy="54" rx="3.2" ry="1.6" fill="rgba(255,255,255,0.06)" />
        <ellipse cx="80" cy="54" rx="3.2" ry="1.6" fill="rgba(255,255,255,0.06)" />
      </svg>
    );
  };

  // Get gender icon
  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '🤖';
    }
  };

  // Render live preview component
  const renderLivePreview = () => {
    const primaryColor = avatarData.visual_appearance.clothing.primary_color;
    const secondaryColor = avatarData.visual_appearance.clothing.secondary_color;
    const themeColor1 = avatarData.branding_elements.theme_colors[0] || '#667eea';
    const themeColor2 = avatarData.branding_elements.theme_colors[1] || '#764ba2';
    const displayName = avatarData.branding_elements.company_name || avatarData.name || 'AI Assistant';

    return (
      <Box>
        {/* Avatar Visual Preview */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 300,
            aspectRatio: '1',
            margin: '0 auto 24px',
            borderRadius: 4,
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 3,
          }}
        >
          {/* replace emoji with SVG cartoon avatar */}
          <AvatarGraphic
            size={200}
            skinTone={avatarData.visual_appearance.face.skin_tone}
            primary={primaryColor}
            secondary={secondaryColor}
            faceShape={avatarData.visual_appearance.face.shape}
            gender={avatarData.voice_characteristics.gender}
          />
          
          {/* Theme color indicators */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              gap: 1,
              flexDirection: 'column',
            }}
          >
            {avatarData.branding_elements.theme_colors.slice(0, 3).map((color, idx) => (
              <Box
                key={idx}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '2px solid white',
                  boxShadow: 2,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Avatar Info Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              {displayName}
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={2}>
              {avatarData.voice_characteristics.gender.charAt(0).toUpperCase() + 
               avatarData.voice_characteristics.gender.slice(1)} voice • {' '}
               {avatarData.voice_characteristics.tone.replace('_', ' ')} tone
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <Chip
                size="small"
                label={`${avatarData.personality_traits.formality} style`}
                color="primary"
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${avatarData.voice_characteristics.accent.replace('_', ' ')}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Speed: ${avatarData.voice_characteristics.speed}x`}
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>

        {/* Sample UI with Theme Colors */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Theme Preview
          </Typography>
          <Box
            sx={{
              height: 60,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${themeColor1} 0%, ${themeColor2} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Header / Button Colors
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${themeColor1} 0%, ${themeColor2} 100%)`,
                flex: 1,
              }}
            >
              Primary Action
            </Button>
            <Button variant="outlined" sx={{ flex: 1 }}>
              Secondary
            </Button>
          </Box>
        </Paper>

        {/* Personality Traits Summary */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Personality Profile
          </Typography>
          <Box sx={{ mt: 1 }}>
            {[
              { label: 'Empathy', value: avatarData.personality_traits.empathy },
              { label: 'Directness', value: avatarData.personality_traits.directness },
              { label: 'Humor', value: avatarData.personality_traits.humor },
              { label: 'Enthusiasm', value: avatarData.personality_traits.enthusiasm },
            ].map((trait) => (
              <Box key={trait.label} mb={1}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption">{trait.label}</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {(trait.value * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    background: '#e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${trait.value * 100}%`,
                      background: `linear-gradient(90deg, ${themeColor1}, ${themeColor2})`,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  };

  // Play a quick sample using Web Speech API with avatar voice characteristics
  const speakPreview = (text?: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Browser does not support speech synthesis');
      return;
    }

    try {
      const t = text || sampleText || `Hi, I'm ${avatarData.name || 'your assistant'}.`;
      
      // Token lists for gender-based voice selection
      const maleTokens = ['guy', 'christopher', 'eric', 'roger', 'steffan', 'william', 'liam', 'james', 'michael', 'john', 'ryan', 'daniel', 'tom', 'mark', 'george', 'paul', 'steve', 'chris'];
      const femaleTokens = ['aria', 'ana', 'jenny', 'michelle', 'samantha', 'sara', 'joanna', 'anna', 'emma', 'luna', 'natasha', 'clara', 'emily', 'leah', 'molly', 'sabela', 'victoria'];

      const nameHas = (voice: SpeechSynthesisVoice, tokens: string[]) => {
        const n = (voice.name || '').toLowerCase();
        return tokens.some(t => n.includes(t));
      };

      const pickVoice = (voicesList: SpeechSynthesisVoice[]) => {
        const gender = (avatarData.voice_characteristics?.gender || 'neutral').toLowerCase();
        const enVoices = voicesList.filter(v => (v.lang || '').toLowerCase().startsWith('en'));
        
        if (gender === 'male') {
          let v = enVoices.find(voice => nameHas(voice, maleTokens) && !nameHas(voice, femaleTokens));
          if (v) return v;
          v = voicesList.find(voice => nameHas(voice, maleTokens) && !nameHas(voice, femaleTokens));
          if (v) return v;
        } else if (gender === 'female') {
          let v = enVoices.find(voice => nameHas(voice, femaleTokens) && !nameHas(voice, maleTokens));
          if (v) return v;
          v = voicesList.find(voice => nameHas(voice, femaleTokens) && !nameHas(voice, maleTokens));
          if (v) return v;
        }
        
        return enVoices[0] || voicesList[0] || null;
      };

      // Async IIFE to handle voice loading and speaking
      (async () => {
        // Ensure voices are loaded
        let voices = window.speechSynthesis.getVoices() || [];
        if (!voices || voices.length === 0) {
          console.log('Voices not loaded, waiting for onvoiceschanged');
          voices = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              try { resolve(window.speechSynthesis.getVoices() || []); } catch { resolve([]); }
            }, 800);
            window.speechSynthesis.onvoiceschanged = () => {
              clearTimeout(timeout);
              resolve(window.speechSynthesis.getVoices() || []);
            };
          });
        } else {
          console.log('Voices already loaded:', voices.length);
        }

        const selected = pickVoice(voices);
        console.log('speakPreview: selected voice:', selected?.name, 'for gender:', avatarData.voice_characteristics?.gender);
        
        const utter = new SpeechSynthesisUtterance(t);
        if (selected) {
          try { utter.voice = selected; } catch (e) { console.warn('Failed to set voice', e); }
        }

        utter.pitch = Math.max(0.5, Math.min(2, 1 + (avatarData.voice_characteristics.pitch / 10)));
        utter.rate = Math.max(0.5, Math.min(2, avatarData.voice_characteristics.speed));
        
        utter.onstart = () => { setPreviewAnimating(true); };
        utter.onend = () => { setPreviewAnimating(false); };
        utter.onerror = (err) => { console.warn('TTS error', err); setPreviewAnimating(false); };
        
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      })();
     } catch (err) {
       console.error('Preview TTS error', err);
       setError('Failed to play preview audio');
     }
   };
  
  // Trigger a small temporary visual animation on the preview element
  const triggerPreviewAnimation = (duration = 900) => {
    setPreviewAnimating(true);
    setTimeout(() => setPreviewAnimating(false), duration);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
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
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={openLivePreview}
          >
            Live Preview
          </Button>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={previewAvatar}
            disabled={!id || id === 'new'}
          >
            Full Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAvatar}
            disabled={loading}
          >
            {loading ? 'Saving...' : id === 'new' ? 'Create Avatar' : 'Save Changes'}
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

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              📋 Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <TextField
              fullWidth
              label="Avatar Name"
              value={avatarData.name}
              onChange={(e) => setAvatarData({ ...avatarData, name: e.target.value })}
              margin="normal"
              required
              placeholder="e.g., Customer Support Bot"
            />
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
              placeholder="e.g., Acme Corporation"
            />
          </Paper>
        </Grid>

        {/* Live Preview (compact, updates as you edit) */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>🔎 Live Preview</Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${avatarData.visual_appearance.clothing.primary_color} 0%, ${avatarData.visual_appearance.clothing.secondary_color} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  color: '#fff',
                  boxShadow: previewAnimating ? '0 12px 30px rgba(0,0,0,0.25)' : '0 6px 18px rgba(0,0,0,0.12)',
                  transform: previewAnimating ? 'scale(1.06)' : 'scale(1)',
                  transition: 'transform 240ms ease, box-shadow 240ms ease',
                }}
              >
                {/* SVG cartoon avatar (compact) */}
                <AvatarGraphic
                  size={72}
                  skinTone={avatarData.visual_appearance.face.skin_tone}
                  primary={avatarData.visual_appearance.clothing.primary_color}
                  secondary={avatarData.visual_appearance.clothing.secondary_color}
                  faceShape={avatarData.visual_appearance.face.shape}
                  gender={avatarData.voice_characteristics.gender}
                />
              </Box>

              <Box flex={1}>
                <Typography fontWeight={700}>{avatarData.branding_elements.company_name || avatarData.name || 'AI Assistant'}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {avatarData.voice_characteristics.gender.charAt(0).toUpperCase() + avatarData.voice_characteristics.gender.slice(1)} voice • {avatarData.voice_characteristics.tone.replace('_', ' ')}
                </Typography>

                <Box mt={1} display="flex" gap={1}>
                  <Button size="small" variant="contained" onClick={() => speakPreview()} startIcon={<PlayIcon />}>Play Sample</Button>
                  <Button size="small" variant="outlined" onClick={() => triggerPreviewAnimation()}>Animate</Button>
                  <Button size="small" onClick={() => setLivePreviewOpen(true)}>Open Full</Button>
                </Box>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Theme Preview</Typography>
              <Box
                sx={{
                  height: 48,
                  borderRadius: 1,
                  background: `linear-gradient(135deg, ${avatarData.branding_elements.theme_colors[0] || '#667eea'} 0%, ${avatarData.branding_elements.theme_colors[1] || '#764ba2'} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                }}
              >
                Header / Button
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Sample Text</Typography>
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="Enter sample text for TTS"
                />
                <Button variant="contained" onClick={() => speakPreview(sampleText)} startIcon={<PlayIcon />}>Play</Button>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="textSecondary">Trigger behaviors:</Typography>
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {avatarData.animation_behaviors.map((b, idx) => (
                  <Button key={idx} size="small" variant="outlined" onClick={() => triggerPreviewAnimation()}>
                    {b.trigger}
                  </Button>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Visual Appearance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              🎨 Visual Appearance
            </Typography>
            <Divider sx={{ mb: 2 }} />

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
              'Clothing Primary Color'
            )}

            {renderColorPicker(
              avatarData.visual_appearance.clothing.secondary_color,
              'visual_appearance.clothing.secondary_color',
              'Clothing Secondary Color'
            )}
          </Paper>
        </Grid>

        {/* Voice Characteristics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              🎙️ Voice Characteristics
            </Typography>
            <Divider sx={{ mb: 2 }} />

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

            <Box mt={3}>
              <Typography gutterBottom>
                Speaking Speed: {avatarData.voice_characteristics.speed.toFixed(1)}x
              </Typography>
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

            <Box mt={3}>
              <Typography gutterBottom>
                Voice Pitch: {avatarData.voice_characteristics.pitch > 0 ? '+' : ''}{avatarData.voice_characteristics.pitch}
              </Typography>
              <Slider
                value={avatarData.voice_characteristics.pitch}
                onChange={(_, value) =>
                  setAvatarData({
                    ...avatarData,
                    voice_characteristics: {
                      ...avatarData.voice_characteristics,
                      pitch: value as number,
                    },
                  })
                }
                min={-10}
                max={10}
                step={1}
                marks={[
                  { value: -10, label: 'Lower' },
                  { value: 0, label: 'Normal' },
                  { value: 10, label: 'Higher' },
                ]}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Personality Traits */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              🧠 Personality Traits
            </Typography>
            <Divider sx={{ mb: 2 }} />

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
              { label: 'Empathy', key: 'empathy', description: 'Shows understanding and care' },
              { label: 'Directness', key: 'directness', description: 'Gets straight to the point' },
              { label: 'Humor', key: 'humor', description: 'Uses lighthearted responses' },
              { label: 'Enthusiasm', key: 'enthusiasm', description: 'Shows energy and excitement' },
              { label: 'Patience', key: 'patience', description: 'Takes time to explain' },
            ].map((trait) => (
              <Box key={trait.key} mt={3}>
                <Typography gutterBottom>
                  {trait.label}: {(avatarData.personality_traits[trait.key as keyof typeof avatarData.personality_traits] as number).toFixed(1)}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  {trait.description}
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
            <Typography variant="h6" gutterBottom fontWeight={600}>
              🎯 Branding Elements
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
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
                  placeholder="https://example.com/logo.png"
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
                  placeholder="Inter, sans-serif"
                />

                {renderColorPicker(
                  avatarData.branding_elements.background_color,
                  'branding_elements.background_color',
                  'Background Color'
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Theme Colors (Used for buttons, headers, gradients)
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" mb={2}>
                  Add 2-5 colors that represent your brand
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {avatarData.branding_elements.theme_colors.map((color, index) => (
                    <Tooltip key={index} title={color}>
                      <Chip
                        label={`Color ${index + 1}`}
                        style={{ 
                          backgroundColor: color, 
                          color: '#fff',
                          fontWeight: 600,
                        }}
                        onDelete={() => removeThemeColor(index)}
                        deleteIcon={<CloseIcon style={{ color: '#fff' }} />}
                      />
                    </Tooltip>
                  ))}
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      backgroundColor: newThemeColor,
                      border: '2px solid #ddd',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowColorPicker(showColorPicker === 'newTheme' ? null : 'newTheme')}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addThemeColor}
                    disabled={avatarData.branding_elements.theme_colors.length >= 5}
                  >
                    Add Color
                  </Button>
                </Box>

                {showColorPicker === 'newTheme' && (
                  <Box mt={2} position="relative">
                    <Box
                      position="fixed"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      onClick={() => setShowColorPicker(null)}
                    />
                    <Box position="relative" zIndex={2}>
                      <SketchPicker
                        color={newThemeColor}
                        onChange={(color) => setNewThemeColor(color.hex)}
                      />
                    </Box>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Animation Behaviors */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              ✨ Animation Behaviors
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary" mb={2}>
              Define how your avatar responds to different situations
            </Typography>

            <Grid container spacing={2}>
              {avatarData.animation_behaviors.map((behavior, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        {behavior.trigger.charAt(0).toUpperCase() + behavior.trigger.slice(1)}
                      </Typography>
                      <FormControl fullWidth size="small">
                        <Select
                          value={behavior.animation}
                          onChange={(e) => {
                            const newBehaviors = [...avatarData.animation_behaviors];
                            newBehaviors[index].animation = e.target.value;
                            setAvatarData({
                              ...avatarData,
                              animation_behaviors: newBehaviors,
                            });
                          }}
                        >
                          <MenuItem value="wave_hand">Wave Hand</MenuItem>
                          <MenuItem value="nod_slowly">Nod Slowly</MenuItem>
                          <MenuItem value="head_tilt">Head Tilt</MenuItem>
                          <MenuItem value="bounce">Bounce</MenuItem>
                          <MenuItem value="idle_blink">Idle Blink</MenuItem>
                          <MenuItem value="smile">Smile</MenuItem>
                        </Select>
                      </FormControl>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Live Preview Dialog */}
      <Dialog
        open={livePreviewOpen}
        onClose={closeLivePreview}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <PlayIcon />
              Live Avatar Preview
            </Box>
            <IconButton onClick={closeLivePreview} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {renderLivePreview()}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLivePreview}>Close</Button>
          <Button
            variant="contained"
            startIcon={<PreviewIcon />}
            onClick={() => {
              closeLivePreview();
              previewAvatar();
            }}
            disabled={!id || id === 'new'}
          >
            Full Preview
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AvatarDesigner;