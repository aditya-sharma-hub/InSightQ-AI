import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# 1. Add handleDownloadReport function after handleDeleteReport (after line 7435)
# Find the line number for handleDeleteReport end
delete_report_end = None
for i in range(7420, 7440):
    if 'setDeleteConfirmReport' in lines[i] and 'finally' in lines[i]:
        delete_report_end = i
        break

print(f'handleDeleteReport ends at line {delete_report_end + 1}')

# 2. Add handleDownloadReport function after handleDeleteReport
download_handler = '''

    /* Report Download Handler */
    const handleDownloadReport = async (report) => {
      if (!report) return;
      setIsReportGenerating(true);
      setReportProgress(0);
      setReportProgressStep('generating');
      setReportError(null);
      try {
        /* Generate report via AI API */
        const reportConfig = collectReportConfiguration(
          generateReportForm,
          report.datasetId ? { id: report.datasetId, name: report.datasetName } : null
        );
        
        const { data, error } = await supabase.rpc('generate_summary', {
          p_user_id: session?.user?.id || 'active-user',
          p_dataset_id: report.datasetId || 'active-dataset',
          p_summary: report.title || report.name || 'Dataset Report',
          p_strengths: report.sections?.includes('kpis') ? ['Key performance metrics'] : [],
          p_weaknesses: report.sections?.includes('anomalies') ? ['Potential anomalies detected'] : [],
          p_opportunities: report.sections?.includes('recommendations') ? ['Actionable insights available'] : [],
          p_recommendations: report.sections?.includes('recommendations') ? ['Review full dataset for strategic opportunities'] : []
        });
        
        if (error) throw error;
        
        /* Create downloadable file from report content */
        const reportContent = JSON.stringify({
          executiveSummary: (data?.executiveSummary || '').substring(0, 500),
          kpiAnalysis: (data?.kpiAnalysis || '').substring(0, 500),
          dataQualityNarrative: (data?.dataQualityNarrative || '').substring(0, 500),
          statisticalFindings: (data?.statisticalFindings || '').substring(0, 500),
          performanceDrivers: (data?.performanceDrivers || [])?.slice(0, 3),
          businessRisks: (data?.businessRisks || [])?.slice(0, 2),
          opportunities: (data?.opportunities || [])?.slice(0, 2),
          recommendedActions: (data?.recommendedActions || [])?.slice(0, 3),
          managementTakeaways: (data?.managementTakeaways || [])?.slice(0, 2),
          generatedAt: new Date().toISOString(),
          datasetId: report.datasetId,
          datasetName: report.datasetName,
          reportTitle: report.title,
          reportType: report.reportType
        });
        
        const blob = new Blob([reportContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title || report.name || 'Report'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        setReportProgress(100);
        setReportProgressStep('completed');
        setReportToast({ type: 'success', message: 'Report downloaded successfully.' });
      } catch (err) {
        console.error('[Download Report Error]', err);
        setReportError(err.message || 'Failed to download report');
        setReportToast({ type: 'error', message: 'Failed to download report. Please try again.' });
      } finally {
        setIsReportGenerating(false);
        setReportProgress(0);
        setReportProgressStep('');
      }
    };
'''

# Insert the download handler after handleDeleteReport
if delete_report_end is not None:
    # Insert after the finally block of handleDeleteReport
    insert_line = delete_report_end + 1
    lines.insert(insert_line, download_handler.strip())
    print(f'Inserted download handler at line {insert_line + 1}')
else:
    print('Could not find handleDeleteReport endpoint')

# 3. Now add the Download button to the Reports section UI
# Find the Reports section and add a Download button
# The Reports section is around lines 3918-3963

# Find where to add the Download button - it should be in the "hasReport || projectReports.length > 0" section
# Looking at the UI, the Download button should be added alongside "View All Reports" and "Generate New Report"

# Let me find the exact line to insert the Download button
for i in range(3930, 3945):
    if 'View All Reports' in lines[i]:
        print(f'Found View All Reports at line {i+1}: {lines[i][:200]}')
    if 'Generate New Report' in lines[i]:
        print(f'Found Generate New Report at line {i+1}: {lines[i][:200]}')

# Also check for the empty state section
for i in range(3948, 3965):
    if 'Generate Report' in lines[i]:
        print(f'Found Generate Report at line {i+1}: {lines[i][:200]}')

print(f'Total lines: {len(lines)}')