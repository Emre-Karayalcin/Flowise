import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// material-ui
import { Stack, useTheme, Typography, Box, Alert, Button, Divider, List, ListItemText, Tabs, Tab } from '@mui/material'
import { IconExclamationCircle } from '@tabler/icons-react'
import { LoadingButton } from '@mui/lab'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'

// Hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'

// API
import authApi from '@/api/auth'
import accountApi from '@/api/account.api'
import loginMethodApi from '@/api/loginmethod'
import ssoApi from '@/api/sso'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { loginSuccess, logoutSuccess } from '@/store/reducers/authSlice'
import { store } from '@/store'

// icons
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'
import GithubSSOLoginIcon from '@/assets/images/github.svg'

// ==============================|| SignInPage ||============================== //

const SignInPage = () => {
    const theme = useTheme()
    const isDarkMode = useSelector((state) => state.customization.isDarkMode)
    useSelector((state) => state.customization)
    useNotifier()
    const { isEnterpriseLicensed, isCloud, isOpenSource } = useConfig()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }
    const [usernameVal, setUsernameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])
    const [authError, setAuthError] = useState(undefined)
    const [loading, setLoading] = useState(false)
    const [showResendButton, setShowResendButton] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [tab, setTab] = useState(0)

    const loginApi = useApi(authApi.login)
    const ssoLoginApi = useApi(ssoApi.ssoLogin)
    const getDefaultProvidersApi = useApi(loginMethodApi.getDefaultLoginMethods)
    const navigate = useNavigate()
    const location = useLocation()
    const resendVerificationApi = useApi(accountApi.resendVerificationEmail)

    const doLogin = (event) => {
        event.preventDefault()
        setLoading(true)
        const body = {
            email: usernameVal,
            password: passwordVal
        }
        loginApi.request(body)
    }

    useEffect(() => {
        if (loginApi.error) {
            setLoading(false)
            if (loginApi.error.response.status === 401 && loginApi.error.response.data.redirectUrl) {
                window.location.href = loginApi.error.response.data.data.redirectUrl
            } else {
                setAuthError(loginApi.error.response.data.message)
            }
        }
    }, [loginApi.error])

    useEffect(() => {
        store.dispatch(logoutSuccess())
        if (!isOpenSource) {
            getDefaultProvidersApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        // Parse the "user" query parameter from the URL
        const queryParams = new URLSearchParams(location.search)
        const errorData = queryParams.get('error')
        if (!errorData) return
        const parsedErrorData = JSON.parse(decodeURIComponent(errorData))
        setAuthError(parsedErrorData.message)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search])

    useEffect(() => {
        if (loginApi.data) {
            setLoading(false)
            store.dispatch(loginSuccess(loginApi.data))
            navigate(location.state?.path || '/dashboard')
            //navigate(0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginApi.data])

    useEffect(() => {
        if (ssoLoginApi.data) {
            store.dispatch(loginSuccess(ssoLoginApi.data))
            navigate(location.state?.path || '/dashboard')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ssoLoginApi.data])

    useEffect(() => {
        if (ssoLoginApi.error) {
            if (ssoLoginApi.error?.response?.status === 401 && ssoLoginApi.error?.response?.data.redirectUrl) {
                window.location.href = ssoLoginApi.error.response.data.redirectUrl
            } else {
                setAuthError(ssoLoginApi.error.message)
            }
        }
    }, [ssoLoginApi.error])

    useEffect(() => {
        if (getDefaultProvidersApi.data && getDefaultProvidersApi.data.providers) {
            //data is an array of objects, store only the provider attribute
            setConfiguredSsoProviders(getDefaultProvidersApi.data.providers.map((provider) => provider))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDefaultProvidersApi.data])

    useEffect(() => {
        if (authError === 'User Email Unverified') {
            setShowResendButton(true)
        } else {
            setShowResendButton(false)
        }
    }, [authError])

    const signInWithSSO = (ssoProvider) => {
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    const handleResendVerification = async () => {
        try {
            await resendVerificationApi.request({ email: usernameVal })
            setAuthError(undefined)
            setSuccessMessage('Verification email has been sent successfully.')
            setShowResendButton(false)
        } catch (error) {
            setAuthError(error.response?.data?.message || 'Failed to send verification email.')
        }
    }

    const handleTabChange = (event, newValue) => {
        setTab(newValue)
        if (newValue === 1) {
            navigate('/register')
        }
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {authError && (
                <Alert
                    icon={<IconExclamationCircle />}
                    variant='filled'
                    severity='error'
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                        minWidth: 320,
                        zIndex: 9999,
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)',
                        bgcolor: isDarkMode ? '#23272a' : undefined,
                        color: isDarkMode ? '#fff' : undefined
                    }}
                >
                    {authError.split(', ').length > 0 ? (
                        <List dense sx={{ py: 0 }}>
                            {authError.split(', ').map((error, index) => (
                                <ListItemText key={index} primary={error} primaryTypographyProps={{ color: '#fff !important' }} />
                            ))}
                        </List>
                    ) : (
                        authError
                    )}
                </Alert>
            )}
            {successMessage && (
                <Alert
                    icon={<IconCircleCheck />}
                    variant='filled'
                    severity='success'
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                        minWidth: 320,
                        zIndex: 9999,
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)'
                    }}
                >
                    {successMessage}
                </Alert>
            )}
            {/* Logo + Welcome */}
            <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Box
                    sx={{
                        bgcolor: '#21a29a',
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2
                    }}
                >
                    <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>N</Typography>
                </Box>
                <Typography
                    variant='h4'
                    sx={{
                        fontFamily: 'Tan Tangkiwood, sans-serif',
                        fontWeight: 700,
                        fontSize: 28,
                        color: isDarkMode ? '#fff' : '#222',
                        mb: 1,
                        textAlign: 'center'
                    }}
                >
                    Welcome to Nuggets
                </Typography>
                <Typography sx={{ color: isDarkMode ? '#bdbdbd' : '#6b7280', fontSize: 16, textAlign: 'center', mb: 0 }}>
                    AI-powered workflow automation platform
                </Typography>
            </Box>
            {/* Card */}
            <Box
                sx={{
                    width: 500,
                    bgcolor: isDarkMode ? '#23272a' : '#fff',
                    borderRadius: 3,
                    boxShadow: isDarkMode ? '0 8px 32px 0 rgba(0,0,0,0.6)' : '0 8px 32px 0 rgba(0,0,0,0.2)',
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={handleTabChange}
                    variant='fullWidth'
                    sx={{
                        width: '100%',
                        bgcolor: isDarkMode ? '#18181b' : '#f5f5f4',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        minHeight: 32,
                        boxShadow: isDarkMode ? '0 2px 8px 0 rgba(0,0,0,0.24)' : '0 2px 8px 0 rgba(0,0,0,0.04)',
                        '& .MuiTabs-indicator': {
                            backgroundColor: 'transparent',
                            height: 0
                        },
                        '& .MuiTab-root': {
                            fontWeight: 500,
                            fontSize: 16,
                            textTransform: 'none',
                            minHeight: 32,
                            bgcolor: isDarkMode ? '#18181b' : '#f5f5f4',
                            color: isDarkMode ? '#bdbdbd' : '#888',
                            borderRadius: '4px',
                            transition: 'color 0.2s, background 0.2s'
                        },
                        '& .Mui-selected': {
                            color: '#21a29a',
                            bgcolor: isDarkMode ? '#23272a' : '#fff'
                        }
                    }}
                >
                    <Tab label='Sign In' />
                    <Tab label='Sign Up' />
                </Tabs>
                <Box sx={{ p: 4, pt: 3, width: '100%' }}>
                    {/* Headline */}
                    <Typography
                        variant='h2'
                        sx={{
                            fontWeight: 600,
                            fontSize: 22,
                            mb: 1,
                            color: isDarkMode ? '#fff' : '#222'
                        }}
                    >
                        Sign in to your account
                    </Typography>
                    <Typography sx={{ color: isDarkMode ? '#bdbdbd' : '#6b7280', mb: 3, fontSize: 15 }}>
                        Enter your email and password to access your workflows.
                    </Typography>
                    {/* Form */}
                    <form onSubmit={doLogin}>
                        <Stack sx={{ width: '100%', gap: 2 }}>
                            <Box>
                                <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                    Email <span style={{ color: '#21a29a' }}>*</span>
                                </Typography>
                                <Input
                                    inputParam={usernameInput}
                                    onChange={(newValue) => setUsernameVal(newValue)}
                                    value={usernameVal}
                                    showDialog={false}
                                    sx={{
                                        '& input': {
                                            fontSize: 16,
                                            padding: '10px 14px'
                                        }
                                    }}
                                />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                    Password <span style={{ color: '#21a29a' }}>*</span>
                                </Typography>
                                <Input
                                    inputParam={passwordInput}
                                    onChange={(newValue) => setPasswordVal(newValue)}
                                    value={passwordVal}
                                    sx={{
                                        '& input': {
                                            fontSize: 16,
                                            padding: '10px 14px'
                                        }
                                    }}
                                />
                                <Typography
                                    variant='body2'
                                    sx={{ color: '#21a29a', mt: 1, textAlign: 'right', fontWeight: 500, fontSize: 14 }}
                                >
                                    <Link style={{ color: '#21a29a' }} to='/forgot-password'>
                                        Forgot password?
                                    </Link>
                                </Typography>
                            </Box>
                            <LoadingButton
                                loading={loading}
                                variant='contained'
                                type='submit'
                                sx={{
                                    borderRadius: 2,
                                    height: 40,
                                    fontSize: 16,
                                    fontWeight: 500,
                                    bgcolor: '#21a29a',
                                    color: '#fff',
                                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                                    mt: 2,
                                    '&:hover': {
                                        bgcolor: '#21a29a',
                                        opacity: 0.85
                                    }
                                }}
                            >
                                Login
                            </LoadingButton>
                        </Stack>
                    </form>
                    <Divider sx={{ my: 3, fontSize: 12 }}>OR CONTINUE WITH</Divider>
                    <Button
                        variant='outlined'
                        disabled
                        startIcon={<img src={GoogleSSOLoginIcon} alt='Google' style={{ width: 24, height: 24 }} />}
                        sx={{
                            width: '100%',
                            height: 40,
                            borderRadius: 2,
                            fontWeight: 500,
                            fontSize: 14,
                            borderColor: '#eee',
                            bgcolor: isDarkMode ? '#6b7280' : '#fafafa',
                            textTransform: 'none',
                            opacity: 1,
                            cursor: 'not-allowed'
                        }}
                    >
                        Sign in with Google (Coming Soon)
                    </Button>
                </Box>
            </Box>
        </Box>
    )
}

export default SignInPage
