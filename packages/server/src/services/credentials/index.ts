import { omit } from 'lodash'
import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { Credential } from '../../database/entities/Credential'
import { transformToCredentialEntity, decryptCredentialData } from '../../utils'
import { ICredentialReturnResponse } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getWorkspaceSearchOptions } from '../../enterprise/utils/ControllerServiceUtils'
import { WorkspaceShared } from '../../enterprise/database/entities/EnterpriseEntities'
import { WorkspaceService } from '../../enterprise/services/workspace.service'
import { Workspace } from '../../enterprise/database/entities/workspace.entity'
import { WorkspaceName } from '../../enterprise/database/entities/workspace.entity'

const createCredential = async (requestBody: any) => {
    try {
        const appServer = getRunningExpressApp()
        const newCredential = await transformToCredentialEntity(requestBody)

        if (requestBody.id) {
            newCredential.id = requestBody.id
        }

        const credential = await appServer.AppDataSource.getRepository(Credential).create(newCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

// Delete all credentials from chatflowid
const deleteCredentials = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).delete({ id: credentialId })
        if (!dbResponse) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.deleteCredential - ${getErrorMessage(error)}`
        )
    }
}

const getAllCredentials = async (paramCredentialName: any, workspaceId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse = []
        if (paramCredentialName) {
            if (Array.isArray(paramCredentialName)) {
                for (let i = 0; i < paramCredentialName.length; i += 1) {
                    const name = paramCredentialName[i] as string
                    const searchOptions = {
                        credentialName: name,
                        ...getWorkspaceSearchOptions(workspaceId)
                    }
                    const credentials = await appServer.AppDataSource.getRepository(Credential).findBy(searchOptions)
                    dbResponse.push(...credentials)
                }
            } else {
                const searchOptions = {
                    credentialName: paramCredentialName,
                    ...getWorkspaceSearchOptions(workspaceId)
                }
                const credentials = await appServer.AppDataSource.getRepository(Credential).findBy(searchOptions)
                dbResponse = [...credentials]
            }
            // get shared credentials
            if (workspaceId) {
                const workspaceService = new WorkspaceService()
                const sharedItems = (await workspaceService.getSharedItemsForWorkspace(workspaceId, 'credential')) as Credential[]
                if (sharedItems.length) {
                    for (const sharedItem of sharedItems) {
                        // Check if paramCredentialName is array
                        if (Array.isArray(paramCredentialName)) {
                            for (let i = 0; i < paramCredentialName.length; i += 1) {
                                const name = paramCredentialName[i] as string
                                if (sharedItem.credentialName === name) {
                                    // @ts-ignore
                                    sharedItem.shared = true
                                    dbResponse.push(sharedItem)
                                }
                            }
                        } else {
                            if (sharedItem.credentialName === paramCredentialName) {
                                // @ts-ignore
                                sharedItem.shared = true
                                dbResponse.push(sharedItem)
                            }
                        }
                    }
                }
            }
        } else {
            const credentials = await appServer.AppDataSource.getRepository(Credential).findBy(getWorkspaceSearchOptions(workspaceId))
            for (const credential of credentials) {
                dbResponse.push(omit(credential, ['encryptedData']))
            }

            // get shared credentials
            if (workspaceId) {
                const workspaceService = new WorkspaceService()
                const sharedItems = (await workspaceService.getSharedItemsForWorkspace(workspaceId, 'credential')) as Credential[]
                if (sharedItems.length) {
                    for (const sharedItem of sharedItems) {
                        // @ts-ignore
                        sharedItem.shared = true
                        dbResponse.push(sharedItem)
                    }
                }
            }
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.getAllCredentials - ${getErrorMessage(error)}`
        )
    }
}



const getCredentialById = async (credentialId: string, workspaceId?: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        // Decrpyt credentialData
        const decryptedCredentialData = await decryptCredentialData(
            credential.encryptedData,
            credential.credentialName,
            appServer.nodesPool.componentCredentials
        )
        const returnCredential: ICredentialReturnResponse = {
            ...credential,
            plainDataObj: decryptedCredentialData
        }
        const dbResponse: any = omit(returnCredential, ['encryptedData'])
        if (workspaceId) {
            const shared = await appServer.AppDataSource.getRepository(WorkspaceShared).count({
                where: {
                    workspaceId: workspaceId,
                    sharedItemId: credentialId,
                    itemType: 'credential'
                }
            })
            if (shared > 0) {
                dbResponse.shared = true
            }
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.createCredential - ${getErrorMessage(error)}`
        )
    }
}

const updateCredential = async (credentialId: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }
        const decryptedCredentialData = await decryptCredentialData(credential.encryptedData)
        requestBody.plainDataObj = { ...decryptedCredentialData, ...requestBody.plainDataObj }
        const updateCredential = await transformToCredentialEntity(requestBody)
        await appServer.AppDataSource.getRepository(Credential).merge(credential, updateCredential)
        const dbResponse = await appServer.AppDataSource.getRepository(Credential).save(credential)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.updateCredential - ${getErrorMessage(error)}`
        )
    }
}

const shareCredentialToAllPersonalWorkspaces = async (credentialId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        
        const credential = await appServer.AppDataSource.getRepository(Credential).findOneBy({
            id: credentialId
        })
        if (!credential) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Credential ${credentialId} not found`)
        }

        const personalWorkspaces = await appServer.AppDataSource.getRepository(Workspace).findBy({
            name: WorkspaceName.DEFAULT_PERSONAL_WORKSPACE
        })

        if (!personalWorkspaces.length) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'No personal workspaces found')
        }

        const workspaceSharedRepository = appServer.AppDataSource.getRepository(WorkspaceShared)
        const sharedItems = []

        for (const workspace of personalWorkspaces) {
            const existingShare = await workspaceSharedRepository.findOneBy({
                workspaceId: workspace.id,
                sharedItemId: credentialId,
                itemType: 'credential'
            })

            if (!existingShare) {
                const newSharedItem = workspaceSharedRepository.create({
                    workspaceId: workspace.id,
                    sharedItemId: credentialId,
                    itemType: 'credential',
                    createdDate: new Date(),
                    updatedDate: new Date()
                })

                const savedSharedItem = await workspaceSharedRepository.save(newSharedItem)
                sharedItems.push({
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    shared: true,
                    shareId: savedSharedItem.id
                })
            } else {
                sharedItems.push({
                    workspaceId: workspace.id,
                    workspaceName: workspace.name,
                    shared: true,
                    shareId: existingShare.id,
                    alreadyShared: true
                })
            }
        }

        return {
            credentialId,
            credentialName: credential.credentialName,
            totalWorkspaces: personalWorkspaces.length,
            sharedToWorkspaces: sharedItems.length,
            newShares: sharedItems.filter(item => !item.alreadyShared).length,
            existingShares: sharedItems.filter(item => item.alreadyShared).length,
            details: sharedItems
        }

    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: credentialsService.shareCredentialToAllPersonalWorkspaces - ${getErrorMessage(error)}`
        )
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    shareCredentialToAllPersonalWorkspaces
}
