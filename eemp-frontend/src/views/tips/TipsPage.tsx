// TipsPage.tsx
import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTipsViewModel } from '../../viewModels/tipsViewModel';
import LoadingState from '../components/LoadingState';

// Custom Markdown components for styling
const markdownComponents = {
  // Render level-3 headings with a gray background and bold text.
  h3: ({ node, ...props }: any) => (
    <Box sx={{ backgroundColor: '#f5f5f5', p: 1, borderRadius: 1, mb: 1 }}>
      <Typography variant="subtitle1" fontWeight="bold" {...props} />
    </Box>
  ),
  // Render paragraphs with some bottom margin.
  p: ({ node, ...props }: any) => (
    <Typography variant="body2" sx={{ mb: 1 }} {...props} />
  ),
  // Render list items as bullet points.
  li: ({ node, ...props }: any) => (
    <Box component="li" sx={{ mb: 1 }}>
      <Typography variant="body2" {...props} />
    </Box>
  ),
  // Render strong text (from ** or __) as bold.
  strong: ({ node, ...props }: any) => (
    <Typography component="span" sx={{ fontWeight: 'bold' }} {...props} />
  ),
};

const TipsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Pull data from your view model:
  // recommendations is expected to be a string containing Markdown.
  const {
    recommendations,
    roomsConsumption, // e.g. [{ name: string; consumption: number }, ...]
    loading,
    error,
  } = useTipsViewModel();

  // Colors for the Pie Chart
  const pieColors = [
    '#5A9FA3',
    '#FF8A65',
    '#4DB6AC',
    '#BA68C8',
    '#FFD54F',
    '#90A4AE',
  ];

  // Loading state
  if (loading) {
    return <LoadingState message="Loading recommendations..." />;
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

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
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
          Recommendations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Your Personalized Energy-Saving Tips
        </Typography>
      </Box>

      {/* Pie Chart for Energy Consumption by Room */}
      <Box
        sx={{
          mb: 3,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 400, mb: 1 }}>
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
              {roomsConsumption.map((room, index) => (
                <Cell key={room.name} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: number) => `${value.toFixed(2)} kWh`}
            />
            <RechartsLegend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: '0.8rem', marginTop: '10px' }}
            />
          </PieChart>
        ) : (
          <Typography variant="body2">
            No room consumption data available.
          </Typography>
        )}
      </Box>

      {/* Recommendations rendered via Markdown */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          Today's Suggestions
        </Typography>
        {recommendations ? (
          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
            {recommendations}
          </ReactMarkdown>
        ) : (
          <Typography sx={{ textAlign: 'center', p: 2 }}>
            No recommendations available.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TipsPage;
