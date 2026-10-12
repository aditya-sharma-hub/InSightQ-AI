import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').read_text(encoding='utf-8')
lines = t.splitlines()

# Add handleDownloadReport function after handleDeleteReport (after line 7435)
# The function ends at line 7435 with "};"

# Insert the new function after line 7435 (which is the "};" closing handleDeleteReport)
# Line 7435 is the closing brace, line 7436 is blank, line 7437 is blank, line 7438 starts /* Canonical */

# I need to insert between line 7435 and line 7437

new_function ='''    /* Report Download Handler */
    const handleDownloadReport = async (report) => {
      if (!report) return;
      setIsReportGenerating(true);
      setReportProgress(0);
      setReportProgressStep('generating');
      setReportError(null);
      try {
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
        a.download = \`${report.title || report.name || 'Report'}.json\`;
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
   
# Insert after line 7435 (the "};" that closes handleDeleteReport)
# Line 7435 in the original is at index 7434 (0-indexed). After inserting, lines shift.
# I need to insert after the "};" at position 7435 (1-indexed), which is index 7434

# Find the position to insert: after "};" that closes handleDeleteReport
insert_idx = None
for i in range(7433, 7438):  # 0-indexed, so lines 7434-7437
    if '};' in lines[i] and i > 7420 and i < 7440:
        insert_idx = i + 1  # Insert after this line
        break

print(f'Insert position: {insert_idx}')

if insert_idx is not None:
    lines.insert(insert_idx, new_function.strip())
    print(f'Inserted download handler, now {len(lines)} lines')
    
    # Now add the Download button to the Reports section UI
    # Find the Reports section - look for "View All Reports" and "Generate New Report"
    # and add a Download button alongside them
    
    # Find "View All Reports" in the Reports section
    for i in range(3930, 3945):
        if 'View All Reports' in lines[i]:
            print(f'View All Reports at line {i+1}')
            # Add Download button after "View All Reports"
            # The buttons are in a div at line 3934-3936
            pass
    
    # Find "Generate New Report" or the empty state "Generate Report"
    for i in range(3948, 3965):
        if 'Generate Report' in lines[i]:
            print(f'Generate Report at line {i+1}: {lines[i][:300]}')
    
    # Write the modified file
    new_t = '\n'.join(lines)
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/app.js').write_text(new_t, encoding='utf-8')
    print('File updated')
else:
    print('Could not find insert position')