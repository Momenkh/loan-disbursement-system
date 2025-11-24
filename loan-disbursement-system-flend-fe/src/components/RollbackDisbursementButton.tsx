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
import UndoIcon from '@mui/icons-material/Undo';

interface Props {
    record?: any;
}

export const RollbackDisbursementButton: React.FC<Props> = (props) => {
    const record = props.record;
    const [open, setOpen] = useState(false);
    const notify = useNotify();
    const refresh = useRefresh();

    if (!record) return null;

    // Only show if disbursement is COMPLETED
    if (record.status !== 'COMPLETED') return null;

    const handleRollback = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/disbursements/${record.id}/rollback`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to rollback disbursement');
            }

            notify('Disbursement rolled back successfully', { type: 'success' });
            setOpen(false);
            refresh();
        } catch (error: any) {
            console.error('Error:', error);
            notify(error.message || 'Error rolling back disbursement', { type: 'error' });
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
                variant="outlined"
                color="error"
                startIcon={<UndoIcon />}
            >
                Rollback
            </Button>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Rollback Disbursement</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Are you sure you want to rollback this disbursement?
                        <br />
                        <strong>Amount: ${record.amount}</strong>
                        <br />
                        This action will reverse the disbursement and return the loan to APPROVED status.
                    </DialogContentText>
                    
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleRollback} 
                        color="error" 
                        variant="contained"
                    >
                        Confirm Rollback
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};