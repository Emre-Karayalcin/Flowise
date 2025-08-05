import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { Box, Drawer, useMediaQuery, Avatar, Typography, Card, CardContent, LinearProgress, Button } from '@mui/material'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

import MenuList from './MenuList'
import LogoSection from '../LogoSection'
import CloudMenuList from '@/layout/MainLayout/Sidebar/CloudMenuList'
import userApi from '@/api/user'
import useApi from '@/hooks/useApi'
import accountApi from '@/api/account.api'

// store
import { drawerWidth, headerHeight } from '@/store/constant'

// User Info Component
const UserInfoCard = () => {
    const theme = useTheme()
    const navigate = useNavigate()
    const currentUser = useSelector((state) => state.auth.user)
    const [credits, setCredits] = useState(currentUser?.credits || 0)
    const logoutApi = useApi(accountApi.logout)

    useEffect(() => {
        const fetchCredits = async () => {
            if (currentUser?.id) {
                try {
                    const res = await userApi.getUserById(currentUser.id)
                    setCredits(res.data?.credits ?? 0)
                } catch (err) {
                    setCredits(currentUser?.credits || 0)
                }
            }
        }
        fetchCredits()
    }, [currentUser?.id])

    useEffect(() => {
        if (logoutApi.data) {
            navigate('/signin')
        }
    }, [logoutApi.data, navigate])

    const handleLogout = () => {
        logoutApi.request()
    }

    if (!currentUser) return null
    if (currentUser.isOrganizationAdmin) return null

    const progressPercentage = 100

    return (
        <Card 
            sx={{ 
                mx: 2, 
                mt: 'auto',
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                boxShadow: 'none'
            }}
        >
            <CardContent sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}>
                {/* Credits Section */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: theme.palette.text.secondary,
                                fontSize: '0.875rem'
                            }}
                        >
                            Crumbs
                        </Typography>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                color: '#ff9800',
                                fontSize: '0.875rem',
                                fontWeight: 600
                            }}
                        >
                            {credits.toLocaleString()}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progressPercentage}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.palette.grey[200],
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: '#ff9800',
                                borderRadius: 4
                            }
                        }}
                    />
                </Box>

                {/* User Info Section */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Avatar 
                        sx={{ 
                            width: 36, 
                            height: 36,
                            bgcolor: theme.palette.grey[400],
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: 'white'
                        }}
                    >
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.875rem',
                                mb: 0.25
                            }}
                        >
                            {currentUser.name || 'User'}
                        </Typography>
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: theme.palette.text.secondary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem'
                            }}
                        >
                            {currentUser.email || 'user@example.com'}
                        </Typography>
                    </Box>
                </Box>

                {/* Sign Out Button */}
                <Button
                    variant="outlined"
                    onClick={handleLogout}
                    disabled={logoutApi.loading}
                    sx={{
                        width: '100%',
                        borderRadius: 2,
                        borderColor: theme.palette.grey[300],
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                            borderColor: theme.palette.grey[400],
                            backgroundColor: theme.palette.grey[50]
                        }
                    }}
                >
                    {logoutApi.loading ? 'Signing Out...' : 'Sign Out'}
                </Button>
            </CardContent>
        </Card>
    )
}

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window }) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const drawer = (
        <>
            <Box
                sx={{
                    display: { xs: 'block', md: 'none' },
                    height: '80px'
                }}
            >
                <Box sx={{ display: 'flex', p: 2, mx: 'auto' }}>
                    <LogoSection />
                </Box>
            </Box>
            <BrowserView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : `calc(100vh - ${headerHeight}px)`,
                        display: 'flex',
                        flexDirection: 'column',
                        paddingBottom: 20
                    }}
                >
                    <MenuList />
                    <CloudMenuList />
                    <UserInfoCard />
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <MenuList />
                    <CloudMenuList />
                    <UserInfoCard />
                </Box>
            </MobileView>
        </>
    )

    const container = window !== undefined ? () => window.document.body : undefined

    return (
        <Box
            component='nav'
            sx={{
                flexShrink: { md: 0 },
                width: matchUpMd ? drawerWidth : 'auto'
            }}
            aria-label='mailbox folders'
        >
            {isAuthenticated && (
                <Drawer
                    container={container}
                    variant={matchUpMd ? 'persistent' : 'temporary'}
                    anchor='left'
                    open={drawerOpen}
                    onClose={drawerToggle}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            background: theme.palette.background.default,
                            color: theme.palette.text.primary,
                            [theme.breakpoints.up('md')]: {
                                top: `${headerHeight}px`
                            },
                            borderRight: drawerOpen ? '1px solid' : 'none',
                            borderColor: drawerOpen ? theme.palette.grey[900] + 25 : 'transparent'
                        }
                    }}
                    ModalProps={{ keepMounted: true }}
                    color='inherit'
                >
                    {drawer}
                </Drawer>
            )}
        </Box>
    )
}

Sidebar.propTypes = {
    drawerOpen: PropTypes.bool,
    drawerToggle: PropTypes.func,
    window: PropTypes.object
}

export default Sidebar