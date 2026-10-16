import React from 'react'

const StatCard = ({stat} : {stat: any}) => {
    const Icon = stat.icon;
    return (
        <div
            key={stat.title}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-muted-foreground">
                        {stat.title}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-3xl">
                        {stat.value.toLocaleString()}
                    </h2>
                </div>
                <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${stat.iconClass}`}
                >
                    <Icon size={20} />
                </div>
            </div>
        </div>
    )
}

export default StatCard