import fp from 'fastify-plugin';

export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data?: T;
}

export default fp(async (fastify) => {
    fastify.decorateReply('success', function (data?: any, message = 'success') {
        this.status(200).send({
            code: 200,
            message,
            data
        });
    });

    fastify.decorateReply('error', function (message = 'error', code = 400, data?: any) {
        this.status(typeof code === 'number' && code >= 100 && code < 600 ? code : 400).send({
            code,
            message,
            data
        });
    });
});

declare module 'fastify' {
    interface FastifyReply {
        success(data?: any, message?: string): void;
        error(message?: string, code?: number, data?: any): void;
    }
}
