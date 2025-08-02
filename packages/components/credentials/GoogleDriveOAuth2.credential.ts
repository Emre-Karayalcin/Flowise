import { INodeParams, INodeCredential } from '../src/Interface'
const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.photos.readonly'
]

class GoogleDriveOAuth2 implements INodeCredential {
    label: string
    name: string
    version: number
    inputs: INodeParams[]
    description: string

    constructor() {
        this.label = 'Google Drive OAuth2'
        this.name = 'googleDriveOAuth2'
        this.version = 1.0
        this.description =
            'Google Drive OAuth2 credentials for accessing Google Drive API';
        this.inputs = []
    }
}

module.exports = { credClass: GoogleDriveOAuth2 }
