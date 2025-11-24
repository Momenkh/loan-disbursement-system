import React, { useState } from 'react';
import { useNotify, useRefresh } from 'react-admin';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';

interface Props {
    record?: any;
}

export const DisburseLoanButton: React.FC<Props> = (props) => {
    const record = props.record;
    const [open, setOpen] = useState(false);
    const notify = useNotify();
    const refresh = useRefresh();

    if (!record) return null;

    // Only show if loan is APPROVED
    if (record.status !== 'APPROVED') return null;

    const handleDisburse = async () => {
        try {
            // Call the POST /disbursements endpoint
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/disbursements`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        loanId: record.id,
                        amount: record.amount,
                        disbursementDate: new Date().toISOString(),
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to disburse loan');
            }

            notify('Loan disbursed successfully', { type: 'success' });
            setOpen(false);
            refresh();
        } catch (error: any) {
            console.error('Error:', error);
            notify(error.message || 'Error disbursing loan', { type: 'error' });
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
                Disburse
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Disburse Loan</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to disburse this loan?
                        <br />
                        <strong>Amount: ${record.amount}</strong>
                        <br />
                        This will mark the disbursement as COMPLETED and the loan as ACTIVE.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleDisburse} color="primary" variant="contained">
                        Confirm Disbursement
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};