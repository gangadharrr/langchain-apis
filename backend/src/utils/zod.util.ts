import { z } from 'zod';
import logger from '../config/logger';

const validatePayloadWithZod = <TSchema extends z.ZodSchema<unknown>>(
	schema: TSchema,
	payload: unknown,
	message: string = 'Payload did not satisfy schema',
): z.infer<TSchema> => {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors = error.issues
				.map(err => {
					return `${err.path.join('.')}: ${err.message}`;
				})
				.join('\n');

			const summarized = error.issues.map((i: z.ZodIssue) => ({
				path: Array.isArray(i.path) && i.path.length ? i.path.join('.') : '(root)',
				message: i.message,
			}));
			logger.warn(`Zod validation failed: ${message} errors:${JSON.stringify(summarized)}`);

			throw new Error(`❌ ${message}:\n${errors}`);
		}
		logger.error({ err: error }, `Unexpected error in zod validation: ${message}`);
		throw error;
	}
};

const stringToInt = (numberSchema: z.ZodNumber = z.number()) =>
	z
		.string()
		.transform(val => parseInt(val, 10))
		.pipe(numberSchema);

const coerceBoolean = z
	.string()
	.transform(val => val === 'true')
	.pipe(z.boolean());

export { stringToInt, validatePayloadWithZod, coerceBoolean };


export function createZodSchema(inputSchema: any): z.ZodObject<any> {
	if (!inputSchema || !inputSchema.properties) {
		return z.object({});
	}

	const schemaObj: Record<string, any> = {};

	for (const [key, prop] of Object.entries(inputSchema.properties)) {
		const propDef = prop as any;
		let zodType: any;

		switch (propDef.type) {
			case 'string':
				zodType = propDef.enum
					? z.enum(propDef.enum as [string, ...string[]])
					: z.string();
				break;
			case 'number':
			case 'integer':
				zodType = z.number();
				break;
			case 'boolean':
				zodType = z.boolean();
				break;
			case 'object':
				zodType = propDef.properties ? createZodSchema(propDef) : z.object(z.any());
				break;
			case 'array':
				if (propDef.items) {
					if (propDef.items.type === 'string') {
						zodType = z.array(z.string());
					} else if (['number', 'integer'].includes(propDef.items.type)) {
						zodType = z.array(z.number());
					} else if (propDef.items.type === 'boolean') {
						zodType = z.array(z.boolean());
					} else if (propDef.items.type === 'object' && propDef.items.properties) {
						zodType = z.array(createZodSchema(propDef.items));
					} else {
						zodType = z.array(z.any());
					}
				} else {
					zodType = z.array(z.any());
				}
				break;
			default:
				zodType = z.any();
		}

		if (propDef.description) {
			zodType = zodType.describe(propDef.description);
		}

		const isRequired = inputSchema.required?.includes(key);
		schemaObj[key] = isRequired ? zodType : zodType.optional();
	}

	return z.object(schemaObj);
}

