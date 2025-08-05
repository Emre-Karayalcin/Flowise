import { Request, Response, NextFunction } from 'express'
import marketplacesService from '../../services/marketplaces'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

// Get all templates for marketplaces
const getAllTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await marketplacesService.getAllTemplates()
        
        const excludedTemplateNames = [
            'Interacting With API',
            'SQL Agent',
            'HuggingFace LLM Chain',
            'SendGrid Email',
            'Advanced Structured Output Parser',
            'Conversational Retrieval QA Chain',
            'List Output Parser',
            'Query Engine',
            'SQL DB Chain',
            'SubQuestion Query Engine',
            'SendGrid Email',
            'Get Current DateTime',
            'Simple DB Chain',
            'Make Webhook',
            'Get Stock Mover',
            'Spide Web Scraper',
            'Spide Web Search & Scraper',
            'Create Airtable Record',
            'Simple Chat Engine',
            'Github Docs QnA',
            'Image Generation',
            'OpenAPI YAML Agent',
            'ReAct Agent',
            'Context Chat Engine',
            'LLM Chain'
        ]
        
        const filteredResponse = apiResponse.filter((template: any) => 
            !excludedTemplateNames.includes(template.templateName)
        )
        
        return res.json(filteredResponse)
    } catch (error) {
        next(error)
    }
}

const deleteCustomTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: marketplacesService.deleteCustomTemplate - id not provided!`
            )
        }
        const apiResponse = await marketplacesService.deleteCustomTemplate(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllCustomTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await marketplacesService.getAllCustomTemplates(req.user?.activeWorkspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const saveCustomTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if ((!req.body && !(req.body.chatflowId || req.body.tool)) || !req.body.name) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: marketplacesService.saveCustomTemplate - body not provided!`
            )
        }
        const body = req.body
        body.workspaceId = req.user?.activeWorkspaceId
        const apiResponse = await marketplacesService.saveCustomTemplate(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllTemplates,
    getAllCustomTemplates,
    saveCustomTemplate,
    deleteCustomTemplate
}
