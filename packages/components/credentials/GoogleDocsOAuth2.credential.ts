import { INodeParams, INodeCredential } from '../src/Interface'
const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
]

class GoogleDocsOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Google Docs OAuth2'
        this.name = 'googleDocsOAuth2'
        this.version = 1.0
        this.description =
            ''
        this.inputs = []
    }
}

module.exports = { credClass: GoogleDocsOAuth2 }
