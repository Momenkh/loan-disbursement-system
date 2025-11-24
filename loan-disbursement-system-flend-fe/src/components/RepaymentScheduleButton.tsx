import React, { useState } from 'react';
import { useNotify } from 'react-admin';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemText,
    Button,
} from '@mui/material';

interface Repayment {
    id: string;
    installmentNumber: number;
    dueDate: string;
    principalAmount: number;
    interestAmount: number;
    status: 'PENDING' | 'PAID' | 'LATE';
    paidDate?: string;
}

interface Props {
    record?: any;
    source?: string; // Added to work as a React-Admin field
}

export const RepaymentScheduleButton: React.FC<Props> = (props) => {
    const record = props.record; // Get record from props
    const [open, setOpen] = useState(false);
    const [schedule, setSchedule] = useState<Repayment[]>([]);
    const notify = useNotify();

    if (!record) return null;

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click from triggering
        try {
            // Call the custom endpoint directly
            const response = await fetch(`${import.meta.env.VITE_API_URL}/repayments/${record.id}/schedule`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ra_token')}`,
                    'Accept': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch schedule');
            }
            
            const data = await response.json();
            console.log('Backend response:', data); // Debug what we're getting
            setSchedule(data as Repayment[]);
            setOpen(true);
        } catch (error) {
            console.error('Fetch error:', error);
            notify('Error fetching repayment schedule', { type: 'error' });
        }
    };

    return (
        <>
            <Button onClick={handleClick} size="small" variant="outlined">
                Installments
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Repayment Schedule</DialogTitle>
                <DialogContent>
                    <List>
                        {schedule.map((s) => (
                            <ListItem key={s.id}>
                                <ListItemText
                                    primary={`Installment #${s.installmentNumber} - Status: ${s.status}`}
                                    secondary={
                                        <>
                                            <div>Principal: ${Number(s.principalAmount).toFixed(2)} | Interest: ${Number(s.interestAmount).toFixed(2)}</div>
                                            <div>Due Date: {new Date(s.dueDate).toLocaleDateString()}</div>
                                            {s.paidDate && <div>Paid: {new Date(s.paidDate).toLocaleDateString()}</div>}
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
};