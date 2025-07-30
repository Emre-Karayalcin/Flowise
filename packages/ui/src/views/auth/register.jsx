import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import {
    Alert,
    Box,
    Button,
    Divider,
    Icon,
    List,
    ListItemText,
    OutlinedInput,
    Stack,
    Tabs,
    Tab,
    Typography,
    useTheme
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import accountApi from '@/api/account.api'
import loginMethodApi from '@/api/loginmethod'
import ssoApi from '@/api/sso'
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'
import useNotifier from '@/utils/useNotifier'
import { passwordSchema } from '@/utils/validation'
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'
import GithubSSOLoginIcon from '@/assets/images/github.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'
import { IconCircleCheck, IconExclamationCircle } from '@tabler/icons-react'

// ==============================|| Register ||============================== //

// IMPORTANT: when updating this schema, update the schema on the server as well
// packages/server/src/enterprise/Interface.Enterprise.ts
const RegisterEnterpriseUserSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: passwordSchema,
        confirmPassword: z.string().min(1, 'Confirm Password is required'),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

const RegisterCloudUserSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: passwordSchema,
        confirmPassword: z.string().min(1, 'Confirm Password is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

const RegisterPage = () => {
    const theme = useTheme()
    useNotifier()
    const { isEnterpriseLicensed, isCloud, isOpenSource } = useConfig()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'text',
        placeholder: 'John Doe'
    }

    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }

    const confirmPasswordInput = {
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        placeholder: '********'
    }

    const emailInput = {
        label: 'EMail',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }

    const inviteCodeInput = {
        label: 'Invite Code',
        name: 'inviteCode',
        type: 'text'
    }

    const [params] = useSearchParams()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [token, setToken] = useState('123')
    const [username, setUsername] = useState('')
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])

    const [loading, setLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [successMsg, setSuccessMsg] = useState(undefined)

    const registerApi = useApi(accountApi.registerAccount)
    const ssoLoginApi = useApi(ssoApi.ssoLogin)
    const getDefaultProvidersApi = useApi(loginMethodApi.getDefaultLoginMethods)
    const navigate = useNavigate()

    const register = async (event) => {
        event.preventDefault()
        if (isEnterpriseLicensed) {
            const result = RegisterEnterpriseUserSchema.safeParse({
                username,
                email,
                token,
                password,
                confirmPassword
            })
            if (result.success) {
                setLoading(true)
                const body = {
                    user: {
                        name: username,
                        email,
                        credential: password,
                        tempToken: token
                    }
                }
                await registerApi.request(body)
            } else {
                const errorMessages = result.error.errors.map((err) => err.message)
                setAuthError(errorMessages.join(', '))
            }
        } else if (isCloud) {
            const formData = new FormData(event.target)
            const referral = formData.get('referral')
            const result = RegisterCloudUserSchema.safeParse({
                username,
                email,
                password,
                confirmPassword
            })
            if (result.success) {
                setLoading(true)
                const body = {
                    user: {
                        name: username,
                        email,
                        credential: password
                    }
                }
                if (referral) {
                    body.user.referral = referral
                }
                await registerApi.request(body)
            } else {
                const errorMessages = result.error.errors.map((err) => err.message)
                setAuthError(errorMessages.join(', '))
            }
        }
    }

    const signInWithSSO = (ssoProvider) => {
        //ssoLoginApi.request(ssoProvider)
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    useEffect(() => {
        if (registerApi.error) {
            if (isEnterpriseLicensed) {
                setAuthError(
                    `Error in registering user. Please contact your administrator. (${registerApi.error?.response?.data?.message})`
                )
            } else if (isCloud) {
                setAuthError(`Error in registering user. Please try again.`)
            }
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerApi.error])

    useEffect(() => {
        if (!isOpenSource) {
            getDefaultProvidersApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (ssoLoginApi.data) {
            store.dispatch(loginSuccess(ssoLoginApi.data))
            navigate(location.state?.path || '/chatflows')
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
        if (registerApi.data) {
            setLoading(false)
            setAuthError(undefined)
            setConfirmPassword('')
            setPassword('')
            setToken('')
            setUsername('')
            setEmail('')
            if (isEnterpriseLicensed) {
                setSuccessMsg('Registration Successful. You will be redirected to the sign in page shortly.')
            } else if (isCloud) {
                setSuccessMsg('To complete your registration, please click on the verification link we sent to your email address')
            }
            setTimeout(() => {
                navigate('/signin')
            }, 3000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerApi.data])

    return (
        <>
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {/* Logo + Welcome */}

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
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)'
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
                {successMsg && (
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
                        {successMsg}
                    </Alert>
                )}
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: '#FFA726', width: 56, height: 56, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>N</Typography>
                    </Box>
                    <Typography
                        variant='h4'
                        sx={{
                            fontFamily: 'Tan Tangkiwood, sans-serif',
                            fontWeight: 700,
                            fontSize: 28,
                            color: '#222',
                            mb: 1,
                            textAlign: 'center'
                        }}
                    >
                        Welcome to Nuggets
                    </Typography>
                    <Typography sx={{ color: '#6b7280', fontSize: 16, textAlign: 'center', mb: 0 }}>
                        AI-powered workflow automation platform
                    </Typography>
                </Box>
                {/* Card */}
                <Box
                    sx={{
                        width: 500,
                        bgcolor: '#fff',
                        borderRadius: 3,
                        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.08)',
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    {/* Tabs */}
                    <Tabs
                        value={1}
                        variant='fullWidth'
                        sx={{
                            width: '100%',
                            bgcolor: '#f5f5f4',
                            borderRadius: '4px',
                            padding: "6px 8px",
                            minHeight: 32,
                            boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)',
                            '& .MuiTabs-indicator': {
                                backgroundColor: 'transparent',
                                height: 0,
                            },
                            '& .MuiTab-root': {
                                fontWeight: 500,
                                fontSize: 16,
                                textTransform: 'none',
                                minHeight: 32,
                                bgcolor: '#f5f5f4',
                                color: '#888',
                                borderRadius: '4px',
                                transition: 'color 0.2s, background 0.2s',
                            },
                            '& .Mui-selected': {
                                color: '#FFA726',
                                bgcolor: '#fff',
                            }
                        }}
                    >
                        <Tab label="Sign In" onClick={() => navigate('/signin')} />
                        <Tab label="Sign Up" />
                    </Tabs>
                    <Box sx={{ p: 4, pt: 3, width: '100%' }}>
                        {/* Headline */}
                        <Typography
                            variant='h2'
                            sx={{
                                fontWeight: 600,
                                fontSize: 22,
                                mb: 1,
                                color: '#222',
                            }}
                        >
                            Create your account
                        </Typography>
                        <Typography sx={{ color: '#6b7280', mb: 3, fontSize: 15 }}>
                            Join Nuggets to start building AI-powered workflows.
                        </Typography>
                        {/* Form */}
                        <form onSubmit={register} data-rewardful>
                            <Stack sx={{ width: '100%', gap: 2 }}>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                        Full Name <span style={{ color: '#FFA726' }}>*</span>
                                    </Typography>
                                    <Input
                                        inputParam={usernameInput}
                                        placeholder='Display Name'
                                        onChange={(newValue) => setUsername(newValue)}
                                        value={username}
                                        showDialog={false}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                        Email <span style={{ color: '#FFA726' }}>*</span>
                                    </Typography>
                                    <Input
                                        inputParam={emailInput}
                                        onChange={(newValue) => setEmail(newValue)}
                                        value={email}
                                        showDialog={false}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                        Password <span style={{ color: '#FFA726' }}>*</span>
                                    </Typography>
                                    <Input inputParam={passwordInput} onChange={(newValue) => setPassword(newValue)} value={password} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 600, mb: 1, fontSize: 15 }}>
                                        Confirm Password <span style={{ color: '#FFA726' }}>*</span>
                                    </Typography>
                                    <Input
                                        inputParam={confirmPasswordInput}
                                        onChange={(newValue) => setConfirmPassword(newValue)}
                                        value={confirmPassword}
                                    />
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
                                        bgcolor: '#FFA726',
                                        color: '#fff',
                                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                                        mt: 2,
                                        '&:hover': {
                                            bgcolor: '#FFA726',
                                            opacity: 0.85
                                        }
                                    }}
                                >
                                    Create Account
                                </LoadingButton>
                            </Stack>
                        </form>
                    </Box>
                </Box>
            </Box>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default RegisterPage
