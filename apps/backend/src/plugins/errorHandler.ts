import fp from 'fastify-plugin';

export default fp(async (fastify) => {
    fastify.setErrorHandler(function (error, request, reply) {
        this.log.error(error);

        // Prisma error codes handling could be added here
        if (error.validation) {
            return reply.status(400).send({
                code: 400,
                message: 'Validation failed',
                data: error.validation
            });
        }

        if (error.statusCode) {
            return reply.status(error.statusCode).send({
                code: error.statusCode,
                message: error.message
            });
        }

        // Default internal server error
        reply.status(500).send({
            code: 500,
            message: 'Internal Server Error'
        });
    });
});
