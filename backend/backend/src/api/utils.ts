export function makeSchema(params: { [param: string]: string }) {
    const required = [];
    const properties: any = {};
    for (let [param, type] of Object.entries(params)) {
        const isOptional = !param.endsWith("?");
        if (!isOptional)
            param = param.slice(0, -1);
        else
            required.push(param);
        properties[param] = { type };
    }

    return {
        querystring: { type: "object", properties, required },
    };
}

