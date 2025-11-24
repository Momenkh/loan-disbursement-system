import React, { useState } from 'react';
import {
  useNotify,
  useRefresh,
} from 'react-admin';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  Typography,
  Box,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';


export const MakePaymentButton: React.FC<{ record?: any }> = ({ record }) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const notify = useNotify();
  const refresh = useRefresh();

  if (!record) return null;
  if (record.status !== 'ACTIVE') return null;

  const handlePayment = async () => {
    if (!amount || Number(amount) <= 0) {
      notify('Please enter a valid amount', { type: 'warning' });
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/repayments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
            'Content-Type': 'application/json',
          },
        body: JSON.stringify({
        loanId: record.id,
        clientId: record.clientId,
        amount: Number(amount),
        paymentDate: new Date().toISOString(),
        })

        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process payment');
      }

      notify('Payment processed successfully', { type: 'success' });
      setOpen(false);
      setAmount('');
      refresh();
    } catch (error: any) {
      notify(error.message || 'Error processing payment', { type: 'error' });
    }
  };

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        size="small"
        variant="contained"
        color="primary"
        startIcon={<PaymentIcon />}
      >
        Pay
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Make Payment - Loan {record.id}</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Loan Amount: ${Number(record.amount).toFixed(2)}
            </Typography>
            <MuiTextField
              autoFocus
              required
              fullWidth
              type="number"
              label="Payment Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              sx={{ mt: 2 }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handlePayment} 
            variant="contained" 
            color="primary"
            disabled={!amount || Number(amount) <= 0}
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};