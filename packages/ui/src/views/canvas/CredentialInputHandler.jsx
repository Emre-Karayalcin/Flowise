import PropTypes from 'prop-types'
import { useEffect, useRef, useState, useMemo } from 'react'

// material-ui
import { Button, IconButton, Typography, Box, Chip } from '@mui/material'
import { IconEdit, IconPlus, IconCheck, IconAlertTriangle } from '@tabler/icons-react'

// project import
import { AsyncDropdown } from '@/ui-component/dropdown/AsyncDropdown'
import AddEditCredentialDialog from '@/views/credentials/AddEditCredentialDialog'
import CredentialListDialog from '@/views/credentials/CredentialListDialog'

// API
import credentialsApi from '@/api/credentials'
import { useAuth } from '@/hooks/useAuth'
import { FLOWISE_CREDENTIAL_ID } from '@/store/constant'

// ===========================|| CredentialInputHandler ||=========================== //

const CredentialInputHandler = ({ inputParam, data, onSelect, disabled = false }) => {
    const ref = useRef(null)
    const [credentialId, setCredentialId] = useState(data?.credential || (data?.inputs && data.inputs[FLOWISE_CREDENTIAL_ID]) || '')
    const [credentialData, setCredentialData] = useState(null)
    const [showCredentialListDialog, setShowCredentialListDialog] = useState(false)
    const [credentialListDialogProps, setCredentialListDialogProps] = useState({})
    const [showSpecificCredentialDialog, setShowSpecificCredentialDialog] = useState(false)
    const [specificCredentialDialogProps, setSpecificCredentialDialogProps] = useState({})
    const [reloadTimestamp, setReloadTimestamp] = useState(Date.now().toString())
    const { hasPermission } = useAuth()

    // Fetch credential data when credentialId changes
    useEffect(() => {
        const fetchCredentialData = async () => {
            if (!credentialId) {
                setCredentialData(null)
                return
            }
            try {
                const credential = await credentialsApi.getSpecificCredential(credentialId)
                setCredentialData(credential?.data?.plainDataObj || null)
            } catch (err) {
                setCredentialData(null)
            }
        }
        fetchCredentialData()
    }, [credentialId])

    // Update credentialId when data changes
    useEffect(() => {
        setCredentialId(data?.credential || (data?.inputs && data.inputs[FLOWISE_CREDENTIAL_ID]) || '')
    }, [data])

    // Logic to get connection status
    const getOAuth2StatusBadge = (credentialName, credentialData) => {
        console.log('getOAuth2StatusBadge called:', { credentialName, credentialData })
        if (!credentialData) return (
            <Chip
                label="Not Connected"
                color="default"
                size="small"
                variant="outlined"
                sx={{ ml: 1 }}
            />
        )

        let isConnected = false
        let statusText = 'Not Connected'
        let statusColor = 'default'

        if (credentialName === 'slackApi') {
            isConnected = !!(credentialData.botToken && credentialData.teamId)
            if (isConnected) {
                statusText = credentialData.team_name ? `Connected to ${credentialData.team_name}` : 'Connected to Slack'
                statusColor = 'success'
            }
        } else if (credentialName === 'notionApi') {
            isConnected = !!(credentialData.access_token)
            if (isConnected) {
                statusText = credentialData.workspace_name ? `Connected to ${credentialData.workspace_name}` : 'Connected to Notion'
                statusColor = 'success'
            }
        } else if (credentialName === 'figmaApi') {
            isConnected = !!(credentialData.access_token)
            if (isConnected) {
                statusText = 'Connected to Figma'
                statusColor = 'success'
            }
        } else if (credentialName.includes('google')) {
            isConnected = !!(credentialData.access_token)
            if (isConnected) {
                statusText = 'Connected to Google'
                statusColor = 'success'
            }
        } else if (credentialName.includes('OAuth2')) {
            isConnected = !!(credentialData.access_token)
            if (isConnected) {
                statusText = 'Connected'
                statusColor = 'success'
            }
        }

        return (
            <Chip
                label={statusText}
                color={statusColor}
                size="small"
                variant={isConnected ? 'filled' : 'outlined'}
                sx={{ ml: 1 }}
            />
        )
    }

    const editCredential = (credentialId) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            credentialId
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }

    const addAsyncOption = async () => {
        try {
            let names = ''
            if (inputParam.credentialNames.length > 1) {
                names = inputParam.credentialNames.join('&')
            } else {
                names = inputParam.credentialNames[0]
            }
            const componentCredentialsResp = await credentialsApi.getSpecificComponentCredential(names)
            if (componentCredentialsResp.data) {
                if (Array.isArray(componentCredentialsResp.data)) {
                    const dialogProp = {
                        title: 'Add New Credential',
                        componentsCredentials: componentCredentialsResp.data
                    }
                    setCredentialListDialogProps(dialogProp)
                    setShowCredentialListDialog(true)
                } else {
                    const dialogProp = {
                        type: 'ADD',
                        cancelButtonName: 'Cancel',
                        confirmButtonName: 'Add',
                        credentialComponent: componentCredentialsResp.data
                    }
                    setSpecificCredentialDialogProps(dialogProp)
                    setShowSpecificCredentialDialog(true)
                }
            }
        } catch (error) {
            console.error(error)
        }
    }

    const onConfirmAsyncOption = (selectedCredentialId = '') => {
        setCredentialId(selectedCredentialId)
        setReloadTimestamp(Date.now().toString())
        setSpecificCredentialDialogProps({})
        setShowSpecificCredentialDialog(false)
        onSelect(selectedCredentialId)
    }

    const onCredentialSelected = (credentialComponent) => {
        setShowCredentialListDialog(false)
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            credentialComponent
        }
        setSpecificCredentialDialogProps(dialogProp)
        setShowSpecificCredentialDialog(true)
    }

    const statusBadge = useMemo(() => {
        return getOAuth2StatusBadge(inputParam.credentialNames?.[0], credentialData)
    }, [credentialData])

    return (
        <div ref={ref}>
            {inputParam && (
                <>
                    {inputParam.type === 'credential' &&
                        (inputParam.credentialNames?.[0]?.includes('OAuth') ||
                            inputParam.credentialNames?.[0]?.includes('notion') ||
                            inputParam.credentialNames?.[0]?.includes('figma') ||
                            inputParam.credentialNames?.[0]?.includes('slack')) ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
                                    {statusBadge}
                                </Box>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                    <AsyncDropdown
                                        disabled={disabled}
                                        name={inputParam.name}
                                        nodeData={data}
                                        value={credentialId ?? 'choose an option'}
                                        isCreateNewOption={hasPermission('credentials:create')}
                                        credentialNames={inputParam.credentialNames}
                                        onSelect={(newValue) => {
                                            setCredentialId(newValue)
                                            onSelect(newValue)
                                        }}
                                        onCreateNew={() => addAsyncOption()}
                                    />
                                    {credentialId && hasPermission('credentials:update') && (
                                        <IconButton
                                            title='Edit Credentials'
                                            color='primary'
                                            size='small'
                                            onClick={() => editCredential(credentialId)}
                                        >
                                            <IconEdit />
                                        </IconButton>
                                    )}
                                    {!credentialId && hasPermission('credentials:create') && (
                                         <IconButton
                                            title='Connect Account'
                                            color='primary'
                                            variant='contained'
                                            onClick={() => addAsyncOption()}
                                            fullWidth
                                        >
                                            <IconPlus />
                                        </IconButton>
                                    )}
                                </div>
                            </Box>
                        </Box>
                    ) : (
                        <div key={reloadTimestamp} style={{ display: 'flex', flexDirection: 'row' }}>
                            <AsyncDropdown
                                disabled={disabled}
                                name={inputParam.name}
                                nodeData={data}
                                value={credentialId ?? 'choose an option'}
                                isCreateNewOption={hasPermission('credentials:create')}
                                credentialNames={inputParam.credentialNames}
                                onSelect={(newValue) => {
                                    setCredentialId(newValue)
                                    onSelect(newValue)
                                }}
                                onCreateNew={() => addAsyncOption(inputParam.name)}
                            />
                            {credentialId && hasPermission('credentials:update') && (
                                <IconButton title='Edit' color='primary' size='small' onClick={() => editCredential(credentialId)}>
                                    <IconEdit />
                                </IconButton>
                            )}
                        </div>
                    )}
                </>
            )}
            {showSpecificCredentialDialog && (
                <AddEditCredentialDialog
                    show={showSpecificCredentialDialog}
                    dialogProps={specificCredentialDialogProps}
                    onCancel={() => setShowSpecificCredentialDialog(false)}
                    onConfirm={onConfirmAsyncOption}
                ></AddEditCredentialDialog>
            )}
            {showCredentialListDialog && (
                <CredentialListDialog
                    show={showCredentialListDialog}
                    dialogProps={credentialListDialogProps}
                    onCancel={() => setShowCredentialListDialog(false)}
                    onCredentialSelected={onCredentialSelected}
                ></CredentialListDialog>
            )}
        </div>
    )
}

CredentialInputHandler.propTypes = {
    inputParam: PropTypes.object,
    data: PropTypes.object,
    onSelect: PropTypes.func,
    disabled: PropTypes.bool
}

export default CredentialInputHandler
