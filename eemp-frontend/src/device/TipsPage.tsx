import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';
import dayjs from 'dayjs';

// --------------------------------------------------------------------------
// 1. CUSTOM HOOK: useIntersectionRatio
//    Tracks how much of the element is visible in the viewport (0 to 1).
// --------------------------------------------------------------------------
function useIntersectionRatio(
  ref: React.RefObject<HTMLElement>,
  options?: IntersectionObserverInit
) {
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setRatio(entry.intersectionRatio);
      },
      {
        // Provide a dense threshold array [0, 0.01, 0.02, ... , 1] for smooth updates
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [ref, options]);

  return ratio;
}

// --------------------------------------------------------------------------
// 2. HELPER: parseMarkdownRecommendations
//    Splits a large recommendation string into sections & items
// --------------------------------------------------------------------------
function parseMarkdownRecommendations(text: string) {
  const lines = text.split('\n').map((l) => l.trim());
  const sections: { heading: string; items: string[] }[] = [];
  let currentSection: { heading: string; items: string[] } | null = null;

  lines.forEach((line) => {
    if (!line) return;
    if (line.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      let headingText = line.replace('### ', '').trim();
      // Remove optional leading "4. " etc.
      const match = headingText.match(/^(\d+\.\s+)?(.*)$/);
      if (match) {
        headingText = match[2].trim();
      }
      currentSection = { heading: headingText, items: [] };
    } else if (currentSection) {
      currentSection.items.push(line);
    }
  });

  if (currentSection) sections.push(currentSection);
  return sections;
}

// --------------------------------------------------------------------------
// 3. HELPER: processBold
//    Renders any text wrapped in *asterisks* or **double asterisks** in bold.
// --------------------------------------------------------------------------
function processBold(text: string): React.ReactNode {
  const parts = text.split(/(\*{1,2}.*?\*{1,2})/g);
  return parts.map((part, idx) => {
    const match = part.match(/^\*{1,2}(.*?)\*{1,2}$/);
    if (match) {
      return <strong key={idx}>{match[1]}</strong>;
    }
    return part;
  });
}

// --------------------------------------------------------------------------
// 4. CHILD COMPONENT: FadeInCard
//    Renders a single recommendation card. Uses the custom hook for fade in/out.
// --------------------------------------------------------------------------
interface FadeInCardProps {
  section: { heading: string; items: string[] };
}

function FadeInCard({ section }: FadeInCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const ratio = useIntersectionRatio(cardRef);

  return (
    <Box
      ref={cardRef}
      sx={{
        p: 2,
        backgroundColor: '#f8f8f8',
        borderRadius: 2,
        border: '1px solid #e0e0e0',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        textAlign: 'left',
        // The intersection ratio is used as opacity, so the card fades in/out as you scroll.
        opacity: ratio,
        transition: 'opacity 0.5s',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
        {processBold(section.heading)}
      </Typography>
      {section.items.map((item, i) => (
        <Typography key={i} variant="body1" sx={{ mb: 1, ml: 2, fontSize: '1rem' }}>
          {processBold(item)}
        </Typography>
      ))}
    </Box>
  );
}

// --------------------------------------------------------------------------
// 5. PARENT COMPONENT: TipsPage (or RecommendationsScreen)
//    Fetches data, renders the PieChart, and a list of <FadeInCard> items.
// --------------------------------------------------------------------------
const TipsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [recommendations, setRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pie chart data
  const [roomsConsumption, setRoomsConsumption] = useState<
    { name: string; consumption: number }[]
  >([]);
  const pieColors = ['#5A9FA3', '#FF8A65', '#4DB6AC', '#BA68C8', '#FFD54F', '#90A4AE'];

  // ------------------------------------------------------------------------
  // Fetch Recommendations
  // ------------------------------------------------------------------------
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const stored = localStorage.getItem('recommendations');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (typeof parsed.recommendations === 'string') {
            setRecommendations(parsed.recommendations);
          } else {
            setRecommendations(JSON.stringify(parsed.recommendations));
          }
          setLoading(false);
          return;
        }
        // Dummy data if none found
        const dummy = `
### 4. **Seasonal Adjustments**
- Efficiency Checks: Keep panels clean, especially when transitioning to cooler weather.
- Temperature Impact: Cooler temperatures can improve solar panel efficiency.

### Device Usage Optimization
- LED Bulbs: Turn off when not in use.
- Smart Sensors: Automate device control to save energy.
        `;
        localStorage.setItem('recommendations', JSON.stringify({ recommendations: dummy }));
        setRecommendations(dummy);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // ------------------------------------------------------------------------
  // Pie Chart Logic
  // ------------------------------------------------------------------------
  useEffect(() => {
    const storedDevicesStr = localStorage.getItem('devices') || '[]';
    let storedDevices: any[] = [];
    try {
      storedDevices = JSON.parse(storedDevicesStr);
    } catch (error) {
      console.error('Error parsing devices:', error);
    }
    const filteredDevices = storedDevices.filter((dev) => {
      const cat = dev.category || dev.deviceCategory;
      return cat !== 'Solar Panel';
    });
    const consumptionPerDevice = filteredDevices.map((dev) => {
      if (!dev.room && !dev.roomName && typeof dev.room !== 'string') return null;
      const powerKW =
        dev.powerRating && dev.powerRating.value
          ? Number(dev.powerRating.value) / (dev.powerRating.unit === 'W' ? 1000 : 1)
          : 0;
      const standbyKW =
        dev.standbyPower && dev.standbyPower.value
          ? Number(dev.standbyPower.value) / (dev.standbyPower.unit === 'W' ? 1000 : 1)
          : 0;
      let avgActiveHours = 1;
      if (
        dev.usagePattern &&
        Array.isArray(dev.usagePattern.usage_times) &&
        dev.usagePattern.usage_times.length > 0
      ) {
        const hoursArr = dev.usagePattern.usage_times.map((ut: any) => {
          const start = dayjs(ut.start);
          const end = dayjs(ut.end);
          if (!start.isValid() || !end.isValid()) return 0;
          let h = end.diff(start, 'hour', true);
          if (h < 0) h += 24;
          return Math.max(0, Math.min(24, h));
        });
        avgActiveHours = hoursArr.reduce((a: number, b: number) => a + b, 0) / hoursArr.length;
      }
      const activeConsumption = powerKW * avgActiveHours;
      const standbyConsumption = standbyKW * (24 - avgActiveHours);
      const totalDaily = activeConsumption + standbyConsumption;
      const quantity = Number(dev.quantity) || 1;
      return { room: dev.room, consumption: totalDaily * quantity };
    });

    const roomMap = new Map<string, number>();
    consumptionPerDevice.forEach((item) => {
      if (item && item.room) {
        let roomName = '';
        let roomType = '';
        if (typeof item.room === 'object') {
          roomName = item.room.roomName || '';
          roomType = item.room.roomType || '';
        } else {
          roomName = item.room;
        }
        const key = `${roomName}||${roomType}`;
        const prev = roomMap.get(key) || 0;
        roomMap.set(key, prev + item.consumption);
      }
    });

    const consumptionArray = Array.from(roomMap.entries()).map(([key, consumption]) => {
      const [roomName, roomType] = key.split('||');
      const displayName = roomType ? `${roomName} (${roomType})` : roomName;
      return { name: displayName, consumption };
    });

    setRoomsConsumption(consumptionArray);
  }, []);

  // Parse recommendations
  const sections = parseMarkdownRecommendations(recommendations);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxWidth: 600,
        mx: 'auto',
        p: isMobile ? 2 : 3,
        pb: 10,
        backgroundColor: '#fff',
      }}
    >
      {/* Header */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
          Recommendations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Your Personalized Energy-Saving Tips
        </Typography>
      </Box>

      {/* Pie Chart Section */}
      <Box
        sx={{
          mb: 3,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 400, mb: 1 }}>
          Energy Consumption by Room
        </Typography>
        {roomsConsumption.length > 0 ? (
          <PieChart width={320} height={320}>
            <Pie
              data={roomsConsumption}
              dataKey="consumption"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {roomsConsumption.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} kWh`} />
            <RechartsLegend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }}
            />
          </PieChart>
        ) : (
          <Typography variant="body2">No room consumption data available.</Typography>
        )}
      </Box>

      {/* Recommendations Section */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
          Today's Suggestions
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ textAlign: 'center', p: 2 }}>
            {error}
          </Typography>
        ) : !recommendations ? (
          <Typography sx={{ textAlign: 'center', p: 2 }}>
            No recommendations available.
          </Typography>
        ) : (
          // Render each recommendation section as a FadeInCard
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map((sec, idx) => (
              <FadeInCard key={idx} section={sec} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TipsPage;
