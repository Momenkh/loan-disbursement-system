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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';

interface Props {
    record?: any;
}

// Loan Approval Button (for CEO/ADMIN)
export const LoanApprovalButton: React.FC<Props> = (props) => {
    const record = props.record;
    const [open, setOpen] = useState(false);
    const [action, setAction] = useState<'approve' | 'reject' | null>(null);
    const notify = useNotify();
    const refresh = useRefresh();

    if (!record) return null;

    // Only show if loan is PENDING
    if (record.status !== 'PENDING') return null;

    const handleOpen = (actionType: 'approve' | 'reject') => {
        setAction(actionType);
        setOpen(true);
    };

    const handleConfirm = async () => {
        try {
            const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/loans/${record.id}/approve`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            if (!response.ok) throw new Error(`Failed to ${action} loan`);

            notify(`Loan ${action}d successfully`, { type: 'success' });
            setOpen(false);
            refresh();
        } catch (error) {
            console.error('Error:', error);
            notify(`Error ${action}ing loan`, { type: 'error' });
        }
    };

    return (
        <>
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpen('approve');
                }}
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                style={{ marginRight: 8 }}
            >
                Approve
            </Button>
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpen('reject');
                }}
                size="small"
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
            >
                Reject
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>
                    {action === 'approve' ? 'Approve Loan' : 'Reject Loan'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to {action} this loan for amount ${record.amount}?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        color={action === 'approve' ? 'success' : 'error'}
                        variant="contained"
                    >
                        Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

// Disbursement Button (for ADMIN/STAFF)
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
            // Update loan status to ACTIVE and disbursement status to COMPLETED
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/loans/${record.id}/disburse`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to disburse loan');

            notify('Loan disbursed successfully', { type: 'success' });
            setOpen(false);
            refresh();
        } catch (error) {
            console.error('Error:', error);
            notify('Error disbursing loan', { type: 'error' });
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