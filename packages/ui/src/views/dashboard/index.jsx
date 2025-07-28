import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Box, Stack, Typography, Button, Card, TextField } from '@mui/material'
import { IconBulb, IconSettings } from '@tabler/icons-react'

const Dashboard = () => {
    const isDarkMode = useSelector(state => state.customization.isDarkMode)
    const [active, setActive] = useState('browse')
    const [input, setInput] = useState('')

    const handleSend = () => {
        if (input.trim()) {
            // ...send logic...
            setInput('')
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <Box
            sx={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: { xs: 4, md: 6 },
                bgcolor: isDarkMode ? '#18181b' : '#f9fafb'
            }}
        >
            <Stack spacing={3} alignItems="center" width="100%">
                <Typography
                    variant="h2"
                    sx={{
                        fontWeight: 800,
                        fontFamily: 'Inter, Poppins, Roboto, sans-serif',
                        textAlign: 'center',
                        fontSize: { xs: 24, md: 32 },
                        color: isDarkMode ? '#fff' : '#222',
                        mb: 0.5,
                    }}
                >
                    What's today's Nugget-worthy idea?
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                    <Button
                        onClick={() => setActive('browse')}
                        startIcon={<IconBulb size={16} style={{ color: active === 'browse' ? '#ffe066' : (isDarkMode ? '#444' : '#bdbdbd') }} />}
                        disableElevation
                        sx={{
                            fontWeight: 700,
                            fontSize: 15,
                            px: 2.5,
                            py: 0.5,
                            borderRadius: '10px',
                            border: '2px solid',
                            borderColor: active === 'browse' ? '#ffe066' : (isDarkMode ? '#333' : '#e0e0e0'),
                            bgcolor: active === 'browse'
                                ? (isDarkMode ? '#292211' : '#fffde7')
                                : (isDarkMode ? '#23272a' : '#fff'),
                            color: active === 'browse'
                                ? (isDarkMode ? '#ffe066' : '#ffe066')
                                : (isDarkMode ? '#888' : '#bdbdbd'),
                            boxShadow: 'none',
                            minWidth: 0,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: active === 'browse'
                                    ? (isDarkMode ? '#292211' : '#fffde7')
                                    : (isDarkMode ? '#23272a' : '#f5f5f5'),
                                borderColor: active === 'browse'
                                    ? '#ffe066'
                                    : (isDarkMode ? '#333' : '#e0e0e0'),
                                color: active === 'browse'
                                    ? '#ffe066'
                                    : (isDarkMode ? '#888' : '#bdbdbd')
                            }
                        }}
                    >
                        <span
                            style={{
                                color: active === 'browse'
                                    ? '#ffe066'
                                    : (isDarkMode ? '#888' : '#bdbdbd'),
                                fontWeight: 700,
                                fontSize: 15
                            }}
                        >
                            Browse Buckets
                        </span>
                    </Button>
                    <Typography
                        sx={{
                            color: isDarkMode ? '#888' : '#888',
                            fontWeight: 600,
                            fontSize: 15
                        }}
                    >
                        or
                    </Typography>
                    <Button
                        onClick={() => setActive('scratch')}
                        disableElevation
                        sx={{
                            fontWeight: 700,
                            fontSize: 15,
                            px: 2.5,
                            py: 0.5,
                            borderRadius: '10px',
                            border: '2px solid',
                            borderColor: '#e0e0e0',
                            bgcolor: active === 'scratch'
                                ? (isDarkMode ? '#23272a' : '#f5f5f5')
                                : (isDarkMode ? '#23272a' : '#fff'),
                            color: active === 'scratch'
                                ? (isDarkMode ? '#fff' : '#444')
                                : (isDarkMode ? '#888' : '#bdbdbd'),
                            boxShadow: 'none',
                            minWidth: 0,
                            transition: 'all 0.2s',
                            '&:hover': {
                                bgcolor: active === 'scratch'
                                    ? (isDarkMode ? '#23272a' : '#f5f5f5')
                                    : (isDarkMode ? '#23272a' : '#f5f5f5'),
                                color: active === 'scratch'
                                    ? (isDarkMode ? '#fff' : '#444')
                                    : (isDarkMode ? '#888' : '#888')
                            }
                        }}
                    >
                        <span
                            style={{
                                color: active === 'scratch'
                                    ? (isDarkMode ? '#fff' : '#444')
                                    : (isDarkMode ? '#888' : '#bdbdbd'),
                                fontWeight: 700,
                                fontSize: 15
                            }}
                        >
                            Start from scratch
                        </span>
                    </Button>
                </Stack>
                <Card
                    elevation={0}
                    sx={{
                        mt: 1.5,
                        px: { xs: 2, md: 4 },
                        py: { xs: 2, md: 3 },
                        borderRadius: '20px',
                        minWidth: { xs: 320, md: 600 },
                        maxWidth: 720,
                        width: '100%',
                        bgcolor: isDarkMode ? '#23272a' : '#fff',
                        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                        border: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start'
                    }}
                >
                    <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={6}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Build a workflow to organize my daily tasks"
                        onKeyDown={handleKeyDown}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                fontSize: 15,
                                fontWeight: 500,
                                color: isDarkMode ? '#fff' : '#222',
                                px: 0,
                                py: 0,
                                mb: 0,
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                '& textarea': {
                                    textAlign: 'left',
                                    resize: 'none',
                                    maxHeight: 120,
                                    lineHeight: 1.4,
                                    backgroundColor: 'transparent',
                                    color: isDarkMode ? '#fff' : '#222'
                                }
                            }
                        }}
                        variant="standard"
                        sx={{
                            mb: 2
                        }}
                    />
                    <Stack direction="row" alignItems="center" width="100%" sx={{ mt: 'auto' }}>
                        <Typography
                            sx={{
                                color: isDarkMode ? '#bdbdbd' : '#8b939b',
                                fontSize: 15,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <span style={{ marginRight: 8, fontSize: 15 }}><IconSettings /></span>
                            Select Apps
                        </Typography>
                        <Box flex={1} />
                        <Typography
                            sx={{
                                color: isDarkMode ? '#888' : '#bdbdbd',
                                fontSize: 14,
                                mr: 1.5,
                                fontWeight: 400
                            }}
                        >
                            Press <b>Shift</b> + <b>Enter</b> for new line
                        </Typography>
                        <Button
                            variant="contained"
                            disableElevation
                            sx={{
                                minWidth: 36,
                                minHeight: 36,
                                borderRadius: '50%',
                                bgcolor: '#ffe066',
                                color: '#fff',
                                boxShadow: 'none',
                                p: 0,
                                '&:hover': {
                                    bgcolor: '#ffe066'
                                }
                            }}
                        >
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="12" fill="none"/>
                                <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="#fff"/>
                            </svg>
                        </Button>
                    </Stack>
                </Card>
            </Stack>
        </Box>
    )
}

export default Dashboard