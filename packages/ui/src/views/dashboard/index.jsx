import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Stack,
    Typography,
    Button,
    Card,
    TextField,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItemButton,
    ListItemText,
    Chip,
    Tooltip,
    Fade
} from '@mui/material'
import { IconBulb, IconSparkles, IconPlus, IconX } from '@tabler/icons-react'
import assistantsApi from '@/api/assistants'
import { cloneDeep } from 'lodash'
import { useTheme } from '@mui/material/styles'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'
import { initNode, showHideInputParams } from '@/utils/genericHelper'
import DocStoreInputHandler from '@/views/docstore/DocStoreInputHandler'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import {
    REMOVE_DIRTY,
    SET_DIRTY,
    SET_CHATFLOW,
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction
} from '@/store/actions'
import { MENU_OPEN } from '@/store/actions'
import chatflowsApi from '@/api/chatflows'
import useNotifier from '@/utils/useNotifier'

const Dashboard = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const isDarkMode = useSelector((state) => state.customization.isDarkMode)
    const [active, setActive] = useState('browse')
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [modelDialogOpen, setModelDialogOpen] = useState(false)
    const [selectedModel, setSelectedModel] = useState(null)
    const [modelsData, setModelsData] = useState([])

    const theme = useTheme()
    const [chatModelsComponents, setChatModelsComponents] = useState([])
    const [chatModelsOptions, setChatModelsOptions] = useState([])

    // Thêm state cho tooltip
    const [showTooltip, setShowTooltip] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    // Fetch models from API
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await assistantsApi.getChatModels()
                setModelsData(res.data || [])
                setChatModelsComponents(res.data || [])
                const options = (res.data || []).map((chatModel) => ({
                    label: chatModel.label,
                    name: chatModel.name,
                    imageSrc: `/api/v1/node-icon/${chatModel.name}`
                }))
                setChatModelsOptions(options)
            } catch (err) {
                setModelsData([])
                setChatModelsComponents([])
                setChatModelsOptions([])
            }
        }
        fetchModels()
    }, [])

    // Open model select dialog
    const handleOpenModelDialog = () => {
        setModelDialogOpen(true)
    }

    // Close model select dialog
    const handleCloseModelDialog = () => {
        setModelDialogOpen(false)
    }

    const handleInputChange = (e) => {
        const value = e.target.value
        setInput(value)
        if (value.trim() && !selectedModel) {
            setIsTyping(true)
            setShowTooltip(true)
        } else {
            setShowTooltip(false)
            setIsTyping(false)
        }
    }

    // Select model from dialog
    const handleSelectModel = (model) => {
        setSelectedModel(model)
        setModelDialogOpen(false)
        setShowTooltip(false)
        setIsTyping(false)
    }

    // Send logic: only allow if model is selected and input is not empty
    const handleSend = async () => {
        if (!input.trim()) return

        try {
            setLoading(true)
            const response = await chatflowsApi.generateAgentflow({
                question: input.trim(),
                selectedChatModel: selectedModel
            })

            if (response.data && response.data.nodes && response.data.edges) {
                // Redirect to canvas and pass nodes, edges via state
                navigate('/v2/agentcanvas', {
                    state: {
                        nodes: response.data.nodes,
                        edges: response.data.edges
                    }
                })
            } else {
                enqueueSnackbar({
                    message: response.error || 'Failed to generate agentflow',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: false,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
            }
        } catch (error) {
            enqueueSnackbar({
                message: error.response?.data?.message || 'Failed to generate agentflow',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: false,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && input.trim() && !loading && selectedModel) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleChatModelDataChange = ({ inputParam, newValue }) => {
        setSelectedModel((prevData) => {
            const updatedData = { ...prevData }
            updatedData.inputs[inputParam.name] = newValue
            updatedData.inputParams = showHideInputParams(updatedData)
            return updatedData
        })
    }

    return (
        <Box
            sx={{
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: isDarkMode ? '#18181b' : '#f9fafb'
            }}
        >
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Typography
                    variant='h2'
                    sx={{
                        fontWeight: 800,
                        fontFamily: 'Tan Tangkiwood, sans-serif',
                        textAlign: 'center',
                        fontSize: { xs: 24, md: 40 },
                        color: isDarkMode ? '#fff' : '#222',
                        mb: 0.5
                    }}
                >
                    What's today's Nugget-worthy idea?
                </Typography>
            </Box>
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    pb: { xs: 4, md: 6 }
                }}
            >
                <Card
                    elevation={0}
                    sx={{
                        px: { xs: 2, md: 3 },
                        pt: { xs: 2, md: 3 },
                        pb: { xs: 1, md: 1 },
                        borderRadius: '20px',
                        minWidth: { xs: 320, md: 600 },
                        maxWidth: 840,
                        width: '100%',
                        bgcolor: isDarkMode ? '#23272a' : '#fff',
                        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
                        border: 'none',
                        display: 'flex',
                        overflow: 'visible',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        position: 'relative'
                    }}
                >
                    {showTooltip && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: -45,
                                left: '5%',
                                transform: 'translateX(0)',
                                bgcolor: isDarkMode ? '#333' : '#fff',
                                color: isDarkMode ? '#fff' : '#333',
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                border: `1px solid ${isDarkMode ? '#555' : '#e0e0e0'}`,
                                fontSize: 14,
                                fontWeight: 500,
                                zIndex: 1000,
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '20px',
                                    transform: 'translateX(0)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '8px solid transparent',
                                    borderRight: '8px solid transparent',
                                    borderBottom: `8px solid ${isDarkMode ? '#333' : '#fff'}`
                                }
                            }}
                        >
                            You need to select a model with the right credentials first
                        </Box>
                    )}

                    <TextField
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={6}
                        value={input}
                        onChange={handleInputChange}
                        placeholder='Build a workflow to organize my daily tasks'
                        onKeyDown={handleKeyDown}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                fontSize: 15,
                                fontWeight: 400,
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
                                    backgroundColor: 'transparent',
                                    color: isDarkMode ? '#fff' : '#222'
                                }
                            }
                        }}
                        variant='standard'
                        sx={{
                            mb: 2
                        }}
                    />

                    <Stack direction='row' alignItems='center' width='100%' sx={{ mt: 'auto' }}>
                        <Tooltip title={!selectedModel ? '' : ''} placement='bottom' arrow>
                            <Typography
                                sx={{
                                    color: isDarkMode ? '#bdbdbd' : '#8b939b',
                                    fontSize: 16,
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s',
                                    '&:hover': {
                                        color: '#ffe066',
                                        '& svg': {
                                            color: '#ffe066'
                                        }
                                    }
                                }}
                                onClick={handleOpenModelDialog}
                            >
                                <span style={{ marginRight: 8, fontSize: 15, display: 'flex', alignItems: 'center' }}>
                                    {selectedModel && selectedModel.name ? (
                                        <img
                                            src={`/api/v1/node-icon/${selectedModel.name}`}
                                            alt={selectedModel.label}
                                            style={{
                                                width: 20,
                                                height: 20,
                                                verticalAlign: 'middle',
                                                borderRadius: 4,
                                                background: isDarkMode ? '#292211' : '#fffde7',
                                                transition: 'filter 0.2s'
                                            }}
                                        />
                                    ) : (
                                        <IconSparkles style={{ color: 'inherit', transition: 'color 0.2s' }} />
                                    )}
                                </span>
                                {selectedModel ? `Change Model` : 'Select Model'}
                            </Typography>
                        </Tooltip>

                        <Box flex={1} />
                        <Typography
                            sx={{
                                color: isDarkMode ? '#888' : '#bdbdbd',
                                fontSize: 16,
                                mr: 1.5,
                                fontWeight: 400
                            }}
                        >
                            Press <b>Shift</b> + <b>Enter</b> for new line
                        </Typography>
                        <Button
                            variant='contained'
                            disableElevation
                            disabled={!input.trim() || loading || !selectedModel}
                            onClick={handleSend}
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
                            {loading ? (
                                <CircularProgress size={20} sx={{ color: '#fff' }} />
                            ) : (
                                <svg width='20' height='20' fill='none' viewBox='0 0 24 24'>
                                    <circle cx='12' cy='12' r='12' fill='none' />
                                    <path d='M2 21L23 12L2 3V10L17 12L2 14V21Z' fill='#fff' />
                                </svg>
                            )}
                        </Button>
                    </Stack>
                </Card>
            </Box>

            {/* Model Select Dialog */}
            <Dialog
                open={modelDialogOpen}
                onClose={handleCloseModelDialog}
                maxWidth='sm'
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        p: 2
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, fontSize: 20, mb: 1 }}>Select model to generate agentflow</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                                Select model<span style={{ color: 'red' }}>&nbsp;*</span>
                            </Typography>
                        </div>
                        <Dropdown
                            key={JSON.stringify(selectedModel)}
                            name={'chatModel'}
                            options={chatModelsOptions ?? []}
                            onSelect={(newValue) => {
                                if (!newValue) {
                                    setSelectedModel(null)
                                } else {
                                    const foundChatComponent = chatModelsComponents.find((chatModel) => chatModel.name === newValue)
                                    if (foundChatComponent) {
                                        const chatModelId = `${foundChatComponent.name}_0`
                                        const clonedComponent = cloneDeep(foundChatComponent)
                                        const initChatModelData = initNode(clonedComponent, chatModelId)
                                        setSelectedModel(initChatModelData)
                                    }
                                }
                            }}
                            value={selectedModel ? selectedModel?.name : 'choose an option'}
                        />
                    </Box>
                    {selectedModel && Object.keys(selectedModel).length > 0 && (
                        <Box
                            sx={{
                                p: 0,
                                mt: 2,
                                mb: 1,
                                border: 1,
                                borderColor: theme.palette.grey[900] + 25,
                                borderRadius: 2
                            }}
                        >
                            {showHideInputParams(selectedModel)
                                .filter((inputParam) => !inputParam.hidden && inputParam.display !== false)
                                .map((inputParam, index) => (
                                    <DocStoreInputHandler
                                        key={index}
                                        inputParam={inputParam}
                                        data={selectedModel}
                                        onNodeDataChange={handleChatModelDataChange}
                                    />
                                ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
                    <Button onClick={handleCloseModelDialog}>Cancel</Button>
                    <StyledPermissionButton
                        permissionId={'agentflows:create'}
                        variant='contained'
                        onClick={() => {
                            setModelDialogOpen(false)
                            setShowTooltip(false)
                            setIsTyping(false)
                        }}
                        startIcon={<IconPlus />}
                        sx={{ borderRadius: 2, height: 40, fontWeight: 700, fontSize: 16 }}
                        disabled={
                            !selectedModel ||
                            !Object.keys(selectedModel).length ||
                            showHideInputParams(selectedModel)
                                .filter((inputParam) => !inputParam.hidden && inputParam.display !== false)
                                .some(
                                    (inputParam) =>
                                        inputParam.required &&
                                        (selectedModel.inputs?.[inputParam.name] === undefined ||
                                            selectedModel.inputs?.[inputParam.name] === '')
                                )
                        }
                    >
                        Add Model
                    </StyledPermissionButton>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default Dashboard
