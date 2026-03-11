export const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return '/';
    }
    return value;
};

export const formatCost = (value) => {
    if (value === null || value === undefined || value === '') {
        return '/';
    }
    return `€${Number(value).toFixed(2)}`;
};

export const formatMileage = (value) => {
    if (value === null || value === undefined || value === '') {
        return '/';
    }
    return `${Number(value).toLocaleString()} km`;
};