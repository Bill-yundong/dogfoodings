import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Box
} from '@mui/material';
import {
  TrendingUp,
  AccessTime,
  DirectionsBus,
  People
} from '@mui/icons-material';

const COLORS = ['#4CAF50', '#FF9800', '#F44336'];

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function OperationAnalysis({ metricsHistory, trajectoryOffsets, passengerFlow }) {
  const [stats, setStats] = useState({
    currentOnTimeRate: 0,
    avgDelay: 0,
    activeBuses: 0,
    totalPassengers: 0
  });

  useEffect(() => {
    if (metricsHistory.length > 0) {
      const latest = metricsHistory[metricsHistory.length - 1];
      const totalPassengers = passengerFlow.reduce(
        (sum, flow) => sum + flow.boardingCount, 0
      );
      
      setStats({
        currentOnTimeRate: Math.round(latest.onTimeRate * 100),
        avgDelay: Math.abs(Math.round(latest.avgDelay)),
        activeBuses: latest.totalCount,
        totalPassengers
      });
    }
  }, [metricsHistory, passengerFlow]);

  const punctualityChartData = metricsHistory.map(m => ({
    time: formatTime(m.timestamp),
    准点率: Math.round(m.onTimeRate * 100),
    平均延误: Math.abs(Math.round(m.avgDelay))
  }));

  const statusDistribution = metricsHistory.length > 0 ? [
    { name: '准点', value: metricsHistory[metricsHistory.length - 1].onTimeCount },
    { name: '早到', value: metricsHistory[metricsHistory.length - 1].earlyCount },
    { name: '延误', value: metricsHistory[metricsHistory.length - 1].delayedCount }
  ] : [];

  const delayChartData = trajectoryOffsets.map(o => ({
    time: formatTime(o.timestamp),
    延误秒数: o.delaySeconds,
    偏离距离: Math.round(o.distanceFromRoute * 1000)
  }));

  const passengerChartData = passengerFlow.map(f => ({
    time: formatTime(f.timestamp),
    上车人数: f.boardingCount,
    下车人数: f.alightingCount,
    满载率: Math.round(f.occupancyRate * 100)
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        运营分析面板
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: '#4CAF50', fontSize: 40 }} />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6" color="text.secondary">
                    当前准点率
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats.currentOnTimeRate}%
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={stats.currentOnTimeRate >= 90 ? '优秀' : stats.currentOnTimeRate >= 70 ? '良好' : '需改进'}
                color={stats.currentOnTimeRate >= 90 ? 'success' : stats.currentOnTimeRate >= 70 ? 'primary' : 'error'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTime sx={{ color: '#FF9800', fontSize: 40 }} />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6" color="text.secondary">
                    平均延误
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats.avgDelay} 秒
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label={stats.avgDelay <= 60 ? '正常' : stats.avgDelay <= 180 ? '轻微延误' : '严重延误'}
                color={stats.avgDelay <= 60 ? 'success' : stats.avgDelay <= 180 ? 'warning' : 'error'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DirectionsBus sx={{ color: '#2196F3', fontSize: 40 }} />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6" color="text.secondary">
                    运营车辆
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats.activeBuses} 辆
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label="实时监控中"
                color="primary"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People sx={{ color: '#9C27B0', fontSize: 40 }} />
                <Box sx={{ ml: 2 }}>
                  <Typography variant="h6" color="text.secondary">
                    累计客流
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                    {stats.totalPassengers.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label="实时统计"
                color="secondary"
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                准点率趋势
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={punctualityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="准点率" 
                    stroke="#4CAF50" 
                    fill="#4CAF50"
                    fillOpacity={0.3}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="平均延误" 
                    stroke="#FF9800"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                车辆状态分布
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                轨迹偏移分析
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={delayChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="延误秒数" stroke="#F44336" strokeWidth={2} />
                  <Line type="monotone" dataKey="偏离距离" stroke="#2196F3" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                客流分析
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={passengerChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="上车人数" fill="#4CAF50" />
                  <Bar dataKey="下车人数" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default OperationAnalysis;
