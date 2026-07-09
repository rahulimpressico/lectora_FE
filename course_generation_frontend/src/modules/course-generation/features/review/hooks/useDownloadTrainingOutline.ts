import { useCallback, useState } from 'react'
import { useCourseStore } from '../../onboarding-flow/store'
import { selectEffectiveTO } from '../../onboarding-flow/store/selectors'
import { exportTrainingOutlineToDocx } from '../../../utils/exportTrainingOutline'

export function useDownloadTrainingOutline() {
  const {
    toData,
    updatedToData,
    courseTitle,
    audience,
    difficultyLevel,
    durationHours,
    wizardData,
  } = useCourseStore()

  const effectiveTO = selectEffectiveTO({ toData, updatedToData })

  const [downloading, setDownloading] = useState(false)

  const download = useCallback(async () => {
    if (!effectiveTO || downloading) return
    setDownloading(true)
    try {
      await exportTrainingOutlineToDocx(effectiveTO, {
        courseTitle,
        ruleFamily: (effectiveTO.rule_family as string | undefined) ?? '',
        audience,
        difficultyLevel,
        durationHours,
        description: wizardData.description || '',
        objectives: wizardData.objectives.length > 0 ? wizardData.objectives : undefined,
      })
    } catch (err) {
      console.error('Failed to generate Training Outline DOCX:', err)
    } finally {
      setDownloading(false)
    }
  }, [effectiveTO, downloading, courseTitle, audience, difficultyLevel, durationHours, wizardData])

  return { download, downloading }
}
