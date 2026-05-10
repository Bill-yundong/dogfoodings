import React, { useState, useMemo } from 'react';
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

const STATUS_MAP = {
  active: { color: 'success', text: '运行中' },
  adjusted: { color: 'warning', text: '已调整' },
  completed: { color: 'default', text: '已完成' }
};

const ADJUSTMENT_ICONS = {
  significant_delay: <Warning sx={{ color: '#F44336' }} />,
  early_arrival: <Update sx={{ color: '#2196F3' }} />
};

const DEFAULT_ADJUSTMENT_ICON = <CheckCircle sx={{ color: '#4CAF50' }} />;

const ADJUSTMENT_REASONS = {
  significant_delay: '严重延误调整',
  early_arrival: '提前到达调整'
};

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

function getStatusInfo(status) {
  return STATUS_MAP[status] || { color: 'default', text: status };
}

function getAdjustmentIcon(reason) {
  return ADJUSTMENT_ICONS[reason] || DEFAULT_ADJUSTMENT_ICON;
}

function getAdjustmentReasonText(reason) {
  return ADJUSTMENT_REASONS[reason] || '自动调整';
}

function SchedulingSystem({ schedules, adjustments }) {
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const recentAdjustments = useMemo(() => {
    return adjustments.slice(-10).reverse();
  }, [adjustments]);

  const scheduleAdjustments = useMemo(() => {
    if (!selectedSchedule) return [];
    return adjustments.filter(a => a.scheduleId === selectedSchedule.id);
  }, [selectedSchedule, adjustments]);

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
                    {schedules.map((schedule) => {
                      const statusInfo = getStatusInfo(schedule.status);
                      return (
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
                              label={statusInfo.text}
                              size="small"
                              color={statusInfo.color}
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
                      );
                    })}
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
              
              {recentAdjustments.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  暂无排班调整记录
                </Typography>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {recentAdjustments.map((adjustment, index) => {
                    const isLast = index === recentAdjustments.length - 1;
                    return (
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
                        {!isLast && <Divider variant="inset" component="li" />}
                      </React.Fragment>
                    );
                  })}
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
                          label={getStatusInfo(selectedSchedule.status).text}
                          size="small"
                          color={getStatusInfo(selectedSchedule.status).color}
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

export default React.memo(SchedulingSystem, (prevProps, nextProps) => {
  return (
    prevProps.schedules.length === nextProps.schedules.length &&
    prevProps.adjustments.length === nextProps.adjustments.length
  );
});
