import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Warning,
  CheckCircle,
  Update,
  AccessTime,
  DirectionsBus,
  History
} from '@mui/icons-material';

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function SchedulingSystem({ schedules, adjustments, onAdjustSchedule }) {
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [groupedSchedules, setGroupedSchedules] = useState(new Map());

  useEffect(() => {
    const grouped = new Map();
    
    for (const schedule of schedules) {
      if (!grouped.has(schedule.routeId)) {
        grouped.set(schedule.routeId, []);
      }
      grouped.get(schedule.routeId).push(schedule);
    }
    
    setGroupedSchedules(grouped);
  }, [schedules]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'adjusted':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '运行中';
      case 'adjusted':
        return '已调整';
      case 'completed':
        return '已完成';
      default:
        return status;
    }
  };

  const getAdjustmentIcon = (reason) => {
    switch (reason) {
      case 'significant_delay':
        return <Warning sx={{ color: '#F44336' }} />;
      case 'early_arrival':
        return <Update sx={{ color: '#2196F3' }} />;
      default:
        return <CheckCircle sx={{ color: '#4CAF50' }} />;
    }
  };

  const getAdjustmentReasonText = (reason) => {
    switch (reason) {
      case 'significant_delay':
        return '严重延误调整';
      case 'early_arrival':
        return '提前到达调整';
      default:
        return '自动调整';
    }
  };

  const scheduleAdjustments = selectedSchedule
    ? adjustments.filter(a => a.scheduleId === selectedSchedule.id)
    : [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        智能排班系统
      </Typography>

      {adjustments.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          icon={<Update />}
        >
          系统已自动进行 {adjustments.length} 次排班调整，基于实时轨迹偏移数据分析
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                排班概览
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>线路</TableCell>
                      <TableCell>车辆</TableCell>
                      <TableCell>开始时间</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow 
                        key={schedule.id}
                        hover
                        selected={selectedSchedule?.id === schedule.id}
                        onClick={() => setSelectedSchedule(schedule)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Chip 
                            label={schedule.routeId} 
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DirectionsBus sx={{ fontSize: 18, mr: 1, color: '#666' }} />
                            {schedule.busId}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDateTime(schedule.startTime)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusText(schedule.status)}
                            size="small"
                            color={getStatusColor(schedule.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small"
                            variant="outlined"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSchedule(schedule);
                            }}
                          >
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                调整历史
              </Typography>
              
              {adjustments.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  暂无排班调整记录
                </Typography>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {adjustments.slice(-10).reverse().map((adjustment, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          {getAdjustmentIcon(adjustment.reason)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="subtitle2" sx={{ mr: 1 }}>
                                {getAdjustmentReasonText(adjustment.reason)}
                              </Typography>
                              <Chip 
                                label={adjustment.scheduleId} 
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {formatDateTime(adjustment.timestamp)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                原计划: {formatTime(adjustment.newStartTime - (adjustment.newStartTime - adjustment.newEndTime))} → 
                                调整后: {formatTime(adjustment.newStartTime)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < adjustments.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {selectedSchedule && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTime sx={{ mr: 1 }} />
                  排班详情 - {selectedSchedule.id}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        基础信息
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Typography color="text.secondary">线路:</Typography>
                        <Typography>{selectedSchedule.routeId}</Typography>
                        
                        <Typography color="text.secondary">车辆:</Typography>
                        <Typography>{selectedSchedule.busId}</Typography>
                        
                        <Typography color="text.secondary">开始时间:</Typography>
                        <Typography>{formatDateTime(selectedSchedule.startTime)}</Typography>
                        
                        <Typography color="text.secondary">结束时间:</Typography>
                        <Typography>{formatDateTime(selectedSchedule.endTime)}</Typography>
                        
                        <Typography color="text.secondary">状态:</Typography>
                        <Chip 
                          label={getStatusText(selectedSchedule.status)}
                          size="small"
                          color={getStatusColor(selectedSchedule.status)}
                        />
                      </Box>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        调整记录 ({scheduleAdjustments.length})
                      </Typography>
                      {scheduleAdjustments.length === 0 ? (
                        <Typography color="text.secondary">
                          该排班暂无调整记录
                        </Typography>
                      ) : (
                        <List dense>
                          {scheduleAdjustments.map((adj, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon>
                                {getAdjustmentIcon(adj.reason)}
                              </ListItemIcon>
                              <ListItemText
                                primary={getAdjustmentReasonText(adj.reason)}
                                secondary={formatDateTime(adj.timestamp)}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        站点时间安排
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableCell>站点顺序</TableCell>
                              <TableCell>站点ID</TableCell>
                              <TableCell>预计到达</TableCell>
                              <TableCell>预计离开</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedSchedule.stopTimes.map((stopTime, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{idx + 1}</TableCell>
                                <TableCell>{stopTime.stopId}</TableCell>
                                <TableCell>{formatTime(stopTime.arrivalTime)}</TableCell>
                                <TableCell>{formatTime(stopTime.departureTime)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default SchedulingSystem;
