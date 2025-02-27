import { Dropdown as OfficeDropdown, IDropdownOption, Stack, Label } from '@fluentui/react';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../../../../../ThemeContext';
import { style } from 'typestyle';
import { ArmObj } from '../../../../../models/arm-obj';
import { FunctionInfo } from '../../../../../models/functions/function-info';
import StringUtils from '../../../../../utils/string';
import { fileSelectorStackStyle, fileSelectorDropdownStyle } from './FunctionEditor.styles';
import { isNewProgrammingModel } from './useFunctionEditorQueries';

export interface FunctionEditorFileSelectorBarProps {
  fileDropdownOptions: IDropdownOption[];
  fileDropdownSelectedKey: string;
  onChangeDropdown: (e: unknown, option: IDropdownOption) => void;
  disabled: boolean;
  functionAppNameLabel?: string;
  functionInfo?: ArmObj<FunctionInfo>;
}
const fileSeparatorStyle = style({
  paddingLeft: '10px',
  paddingRight: '10px',
});

const FunctionEditorFileSelectorBar: React.FC<FunctionEditorFileSelectorBarProps> = props => {
  const { functionAppNameLabel, fileDropdownOptions, fileDropdownSelectedKey, onChangeDropdown, functionInfo, disabled } = props;
  const { t } = useTranslation();
  const theme = useContext(ThemeContext);
  const isNewProgramming = isNewProgrammingModel(functionInfo);

  return (
    <>
      <Stack horizontal className={fileSelectorStackStyle(theme)}>
        {isNewProgramming ? (
          <Label className={fileSeparatorStyle}>{functionAppNameLabel}</Label>
        ) : (
          <>
            <Label>{functionAppNameLabel}</Label>
            <Label className={fileSeparatorStyle}>{StringUtils.fileSeparator}</Label>
            <Label>{functionInfo?.properties.name}</Label>
            <Label className={fileSeparatorStyle}>{StringUtils.fileSeparator}</Label>
          </>
        )}
        <OfficeDropdown
          id="fucntion-editor-file-selector"
          defaultSelectedKey={fileDropdownSelectedKey}
          options={fileDropdownOptions}
          onChange={onChangeDropdown}
          ariaLabel={t('functionDirectoryDropdownAriaLabel')}
          disabled={disabled}
          styles={fileSelectorDropdownStyle()}
        />
      </Stack>
    </>
  );
};

export default FunctionEditorFileSelectorBar;
