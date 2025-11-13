import { NextResponse } from 'next/server';

type TransferOperatorMetric = {
    label: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
    change: number;
};

type TransferOperatorAlert = {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: string;
};

type TransferOperatorDashboardPayload = {
    summary: {
        totalBookings: number;
        activeRoutes: number;
        availableDrivers: number;
        satisfactionScore: number;
    };
    metrics: TransferOperatorMetric[];
    alerts: TransferOperatorAlert[];
    performance: {
        onTimePercentage: number;
        delayedTrips: number;
        cancelledTrips: number;
    };
    revenue: {
        daily: number;
        weekly: number;
        monthly: number;
        currency: string;
    };
};

const mockDashboardData: TransferOperatorDashboardPayload = {
    summary: {
        totalBookings: 128,
        activeRoutes: 14,
        availableDrivers: 32,
        satisfactionScore: 4.7,
    },
    metrics: [
        {
            label: 'Новых бронирований (24ч)',
            value: 26,
            trend: 'up',
            change: 12,
        },
        {
            label: 'Среднее время подачи',
            value: 11,
            trend: 'down',
            change: 8,
        },
        {
            label: 'Заполненность автопарка',
            value: 74,
            trend: 'stable',
            change: 0,
        },
        {
            label: 'Отмены клиентами',
            value: 3,
            trend: 'down',
            change: 25,
        },
    ],
    alerts: [
        {
            id: 'alert-1',
            title: 'Перегруженный маршрут',
            description: 'Маршрут AeroExpress → Центр превышает лимит по бронированиям на 25%.',
            severity: 'high',
            createdAt: new Date().toISOString(),
        },
        {
            id: 'alert-2',
            title: 'Недостаточно водителей',
            description: 'Вечерние смены пятницы требуют минимум +4 водителя.',
            severity: 'medium',
            createdAt: new Date(new Date().getTime() - 1000 * 60 * 45).toISOString(),
        },
    ],
    performance: {
        onTimePercentage: 92,
        delayedTrips: 6,
        cancelledTrips: 3,
    },
    revenue: {
        daily: 186000,
        weekly: 1210000,
        monthly: 4980000,
        currency: 'RUB',
    },
};

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        generatedAt: new Date().toISOString(),
        data: mockDashboardData,
    });
}


