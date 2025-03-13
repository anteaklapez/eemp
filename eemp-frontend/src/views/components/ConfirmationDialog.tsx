import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from '@mui/material';

interface ConfirmationDialogProps {
    open: boolean;
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: 'primary' | 'error' | 'secondary' | 'info' | 'success' | 'warning';
}

/**
 * Confirmation Dialog component
 * Used for confirming destructive actions like deletion
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
                                                                   open,
                                                                   title,
                                                                   message,
                                                                   onCancel,
                                                                   onConfirm,
                                                                   confirmLabel = 'Confirm',
                                                                   cancelLabel = 'Cancel',
                                                                   confirmColor = 'error',
                                                               }) => {
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            PaperProps={{
                sx: { borderRadius: 4, textAlign: 'center', p: 3 },
            }}
        >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
                {title}
            </DialogTitle>
            <DialogContent>
                <Typography>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', gap: 2 }}>
                <Button
                    variant="contained"
                    onClick={onCancel}
                    sx={{
                        backgroundColor: '#ccc',
                        color: '#000',
                        textTransform: 'none',
                        borderRadius: '8px',
                        ':hover': { backgroundColor: '#aaa' },
                    }}
                >
                    {cancelLabel}
                </Button>
                <Button
                    variant="contained"
                    color={confirmColor}
                    onClick={onConfirm}
                    sx={{
                        color: '#fff',
                        textTransform: 'none',
                        borderRadius: '8px',
                    }}
                >
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;