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
  Paper,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Table,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

export const PaymentHistoryButton: React.FC<{ record?: any }> = ({ record }) => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  if (!record) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/repayments/${record.id}/history`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch payment history');

      const data = await response.json();
      setHistory(data);
      setOpen(true);
    } catch (error) {
      notify('Error fetching payment history', { type: 'error' });
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
        startIcon={<HistoryIcon />}
        disabled={loading}
      >
        History
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Payment History - Loan {record.id}</DialogTitle>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          {history.length === 0 ? (
            <Typography>No payment history found</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Principal</TableCell>
                    <TableCell align="right">Interest</TableCell>
                    <TableCell align="right">Late Fee</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right">${Number(payment.amount).toFixed(2)}</TableCell>
                      <TableCell align="right">${Number(payment.principalPaid).toFixed(2)}</TableCell>
                      <TableCell align="right">${Number(payment.interestPaid).toFixed(2)}</TableCell>
                      <TableCell align="right">${Number(payment.lateFeePaid).toFixed(2)}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};