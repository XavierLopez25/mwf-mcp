export interface JSONSchema {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
    enum?: any[];
    items?: any;
    description?: string;
}
export interface ToolDef {
    name: string;
    description: string;
    inputSchema: JSONSchema;
}
export type ToolHandler = (args: any) => Promise<any>;