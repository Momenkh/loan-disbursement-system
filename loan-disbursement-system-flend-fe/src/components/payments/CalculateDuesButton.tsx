import React, { useState } from 'react';
import {
  useNotify,
} from 'react-admin';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,

} from '@mui/material';

import CalculateIcon from '@mui/icons-material/Calculate';

export const CalculateDuesButton: React.FC<{ record?: any }> = ({ record }) => {
  const [open, setOpen] = useState(false);
  const [dues, setDues] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  if (!record) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/repayments/${record.id}/calculate`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to calculate dues');

      const data = await response.json();
      setDues(data);
      setOpen(true);

      console.log('Calculated Dues:', data);
    } catch (error) {
      notify('Error calculating dues', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        size="small"
        variant="outlined"
        color="info"
        startIcon={<CalculateIcon />}
        disabled={loading}
      >
        Calculate
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Current Dues - Loan {record.id}</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {dues && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Total Due: ${Number(
                  (dues.outstandingPrincipal || 0) + 
                  (dues.interestAccrued || 0) + 
                  (dues.lateFee || 0)
                ).toFixed(2)}
              </Typography>

              <Typography>Next installment due: ${Number(dues.nextInstallmentDue.totalDue || 0).toFixed(2)}</Typography>
              <Typography>Late Fees: ${Number(dues.lateFee || 0).toFixed(2)}</Typography>
              <Typography color="error" sx={{ mt: 1 }}>
                Days Overdue: {dues.daysOverdue || 0}
              </Typography>

              <Typography>Principal Due: ${Number(dues.outstandingPrincipal || 0).toFixed(2)}</Typography>
              <Typography>Interest Due: ${Number(dues.interestAccrued || 0).toFixed(2)}</Typography>

            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};