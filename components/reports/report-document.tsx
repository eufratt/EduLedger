import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from "@react-pdf/renderer"

// Register font for better look (optional, standard is fine)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        padding: 40,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
    },
    header: {
        marginBottom: 30,
        borderBottom: 1,
        borderBottomColor: "#e2e8f0",
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 12,
        color: "#64748b",
        marginBottom: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#334155",
        marginTop: 20,
        marginBottom: 15,
    },
    table: {
        display: "flex",
        width: "auto",
        borderStyle: "solid",
        borderWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
        paddingVertical: 12,
    },
    tableRowHeader: {
        backgroundColor: "#f8fafc",
        borderBottomWidth: 2,
        borderBottomColor: "#e2e8f0",
    },
    tableCol: {
        width: "70%",
    },
    tableColAmount: {
        width: "30%",
        textAlign: "right",
    },
    tableCell: {
        fontSize: 11,
        color: "#475569",
    },
    tableCellHeader: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#1e293b",
    },
    totalRow: {
        marginTop: 20,
        flexDirection: "row",
        paddingTop: 15,
        borderTopWidth: 2,
        borderTopColor: "#3b82f6",
    },
    totalLabel: {
        width: "70%",
        fontSize: 14,
        fontWeight: "bold",
        color: "#1e293b",
    },
    totalValue: {
        width: "30%",
        textAlign: "right",
        fontSize: 14,
        fontWeight: "bold",
        color: "#2563eb",
    },
    footer: {
        position: "absolute",
        bottom: 40,
        left: 40,
        right: 40,
        textAlign: "center",
        fontSize: 10,
        color: "#94a3b8",
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
        paddingTop: 10,
    }
})

interface ReportDocumentProps {
    report: {
        title: string
        period: string
        type: string
        summary: any
        createdAt: string
    }
}

function formatIDR(n: number) {
    return "Rp " + n.toLocaleString("id-ID")
}

export function ReportDocument({ report }: ReportDocumentProps) {
    const isBalance = report.type === "BALANCE"
    const isIncome = report.type === "INCOME"
    const breakdown = report.summary.breakdown || []
    
    // Format period: "2024-12" -> "Desember 2024"
    const formatPeriode = (p: string) => {
        const [y, m] = p.split("-")
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        return `${months[parseInt(m) - 1]} ${y}`
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{report.title}</Text>
                    <Text style={styles.subtitle}>Periode: {formatPeriode(report.period)}</Text>
                    <Text style={styles.subtitle}>Dibuat pada: {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </View>

                {/* Content */}
                <Text style={styles.sectionTitle}>Ringkasan Laporan</Text>

                <View style={styles.table}>
                    {/* Header Row */}
                    <View style={[styles.tableRow, styles.tableRowHeader]}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCellHeader}>Keterangan</Text>
                        </View>
                        <View style={styles.tableColAmount}>
                            <Text style={styles.tableCellHeader}>Jumlah</Text>
                        </View>
                    </View>

                    {/* Data Rows */}
                    {!isBalance ? (
                        breakdown.map((item: any, i: number) => (
                            <View key={i} style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>{item.name}</Text>
                                </View>
                                <View style={styles.tableColAmount}>
                                    <Text style={styles.tableCell}>{formatIDR(item.amount)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <>
                            <View style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>Total Penerimaan</Text>
                                </View>
                                <View style={styles.tableColAmount}>
                                    <Text style={styles.tableCell}>{formatIDR(report.summary.income)}</Text>
                                </View>
                            </View>
                            <View style={styles.tableRow}>
                                <View style={styles.tableCol}>
                                    <Text style={styles.tableCell}>Total Pengeluaran</Text>
                                </View>
                                <View style={styles.tableColAmount}>
                                    <Text style={styles.tableCell}>{formatIDR(report.summary.expense)}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Total Section */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>
                        {isBalance ? "Saldo Akhir" : isIncome ? "Total Penerimaan" : "Total Pengeluaran"}
                    </Text>
                    <Text style={styles.totalValue}>
                        {formatIDR(isBalance ? report.summary.balance : report.summary.total)}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>EduLedger - Sistem Pengelolaan Keuangan Sekolah Digital</Text>
                    <Text>© {new Date().getFullYear()} EduLedger. Semua Hak Dilindungi.</Text>
                </View>
            </Page>
        </Document>
    )
}
