import { INodeParams, INodeCredential } from '../src/Interface'
const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.metadata'
]

class GoogleSheetsOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Google Sheets OAuth2'
        this.name = 'googleSheetsOAuth2'
        this.version = 1.0
        this.description =
            ''
        this.inputs = []
    }
}

module.exports = { credClass: GoogleSheetsOAuth2 }
