import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ActionBar from '../../../../components/ActionBar';
import { FormAzureStorageMounts } from '../AppSettings.types';
import { Checkbox, IChoiceGroupOption } from '@fluentui/react';
import AzureStorageMountsAddEditBasic from './AzureStorageMountsAddEditBasic';
import AzureStorageMountsAddEditAdvanced from './AzureStorageMountsAddEditAdvanced';
import { Formik, FormikProps, Field, Form } from 'formik';
import TextField from '../../../../components/form-controls/TextField';
import { StorageAccountsContext } from '../Contexts';
import { addEditFormStyle, textFieldPrefixStylesOverride } from '../../../../components/form-controls/formControl.override.styles';
import RadioButton from '../../../../components/form-controls/RadioButton';
import * as Yup from 'yup';
import { ValidationRegex } from '../../../../utils/constants/ValidationRegex';
import { CommonConstants } from '../../../../utils/CommonConstants';
import { style } from 'typestyle';
import { SiteStateContext } from '../../../../SiteState';
import { StorageType } from '../../../../models/site/config';
import { formElementStyle } from '../AppSettings.styles';

const MountPathValidationRegex = ValidationRegex.StorageMountPath;
const MountPathExamples = CommonConstants.MountPathValidationExamples;

enum ConfigurationOption {
  Basic = 'basic',
  Advanced = 'advanced',
}

export interface AzureStorageMountsAddEditProps {
  updateAzureStorageMount: (item: FormAzureStorageMounts) => any;
  otherAzureStorageMounts: FormAzureStorageMounts[];
  closeBlade: () => void;
  azureStorageMount: FormAzureStorageMounts;
  // TODO (refortie): Temporary until xenon validation is put in
  enableValidation: boolean;
}

export type AzureStorageMountsAddEditPropsCombined = AzureStorageMountsAddEditProps;
const AzureStorageMountsAddEdit: React.SFC<AzureStorageMountsAddEditPropsCombined> = props => {
  const { closeBlade, otherAzureStorageMounts, azureStorageMount, updateAzureStorageMount, enableValidation } = props;
  const storageAccounts = useContext(StorageAccountsContext);
  const siteState = useContext(SiteStateContext);
  const [configurationOption, setConfigurationOption] = useState<string>(ConfigurationOption.Basic);
  const { t } = useTranslation();
  const [basicDisabled, setBasicDisabled] = useState(false);
  const [initialName] = useState(azureStorageMount.name);
  const [initialMountPath] = useState(azureStorageMount.mountPath);

  const isLinuxOrContainer = () => {
    return !!siteState && (!!siteState.isLinuxApp || !!siteState.isContainerApp);
  };

  const getMountPathDisplayValue = (mountPath: string): string => {
    if (isLinuxOrContainer()) {
      return mountPath;
    }
    const startIndex = CommonConstants.windowsCodeMountPathPrefix.length;
    return startIndex < mountPath.length && mountPath.indexOf(CommonConstants.windowsCodeMountPathPrefix) === 0
      ? mountPath.substring(startIndex)
      : mountPath;
  };

  const initialFormValue = useMemo<FormAzureStorageMounts>(
    () => ({
      ...azureStorageMount,
      mountPath: getMountPathDisplayValue(azureStorageMount.mountPath),

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [azureStorageMount]
  );

  const shareNameMaxLength = 64;
  const mountPathDefaultMaxLength = 256;
  const mountPathMaxLength = isLinuxOrContainer()
    ? mountPathDefaultMaxLength
    : mountPathDefaultMaxLength - CommonConstants.windowsCodeMountPathPrefix.length;

  const shareNameRegex = /^[a-zA-Z0-9[\]()\-_]+$/;
  const cancel = () => {
    closeBlade();
  };

  const getLinuxMountPathValidation = (value: string): boolean => {
    if (!siteState) {
      return true;
    }
    return MountPathValidationRegex.linux.test(value);
  };

  const getWindowsMountPathValidation = (value: string): boolean => {
    let valid = true;
    if (!siteState) {
      return valid;
    }
    if (siteState.isContainerApp) {
      valid =
        MountPathValidationRegex.windowsContainer[0].test(value) &&
        !MountPathValidationRegex.windowsContainer[1].test(value) &&
        !MountPathValidationRegex.windowsContainer[2].test(value);
    } else {
      valid = MountPathValidationRegex.windowsCode.test(value);
    }

    return valid;
  };

  const validateMountPath = (value: string): string | undefined => {
    value = getMountPathInputValue(value);
    if (!siteState) {
      return undefined;
    }
    if (!value) {
      return t('validation_requiredError');
    }

    let valid = true;
    if (siteState.isLinuxApp) {
      valid = getLinuxMountPathValidation(value);
    } else {
      valid = getWindowsMountPathValidation(value);
    }
    return valid ? undefined : t('validation_invalidMountPath');
  };

  const displayMountPathInfoBubble = (): string => {
    if (!siteState) {
      return '';
    }
    let mountPathInfoBubble;
    if (siteState.isLinuxApp) {
      mountPathInfoBubble = MountPathExamples.linux;
    } else if (siteState.isContainerApp) {
      mountPathInfoBubble = MountPathExamples.windowsContainer;
    } else {
      mountPathInfoBubble = MountPathExamples.windowsCode;
    }
    const { valid, invalid } = mountPathInfoBubble;
    return t('mountPath_info').format(valid, invalid);
  };

  const setMountPathPrefix = (): string | undefined => {
    return isLinuxOrContainer() ? undefined : CommonConstants.windowsCodeMountPathPrefix;
  };

  const getMountPathInputValue = (input: string): string => {
    return isLinuxOrContainer() ? input : `${CommonConstants.windowsCodeMountPathPrefix}${input}`;
  };

  const mountPathValidation = Yup.string()
    .required(t('validation_requiredError'))
    .max(mountPathMaxLength, t('validation_fieldMaxCharacters').format(mountPathMaxLength))
    .test('cannotMountHomeDirectory', t('validation_mountPathNotHome'), (value: string) => {
      value = getMountPathInputValue(value);
      const homeDir = ValidationRegex.StorageMountPath.homeDir;
      return !homeDir.test(value);
    })
    .test('uniqueMountPath', t('validation_mouthPathMustBeUnique'), value => {
      value = getMountPathInputValue(value);
      return (
        !value ||
        value === initialMountPath ||
        !otherAzureStorageMounts.some(storageMount => storageMount.mountPath.toLowerCase() === value.toLowerCase())
      );
    });

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required(t('validation_requiredError'))
      .test('uniqueName', t('azureStorageMountMustBeUnique'), value => {
        return (
          !value ||
          value.toLowerCase() === initialName.toLowerCase() ||
          !otherAzureStorageMounts.some(storageMount => storageMount.name.toLowerCase() === value.toLowerCase())
        );
      }),
    accountName: Yup.string().required(t('validation_requiredError')),
    shareName: Yup.string()
      .max(shareNameMaxLength, t('validation_fieldMaxCharacters').format(shareNameMaxLength))
      .matches(shareNameRegex, t('validation_shareNameAllowedCharacters')),
    accessKey: Yup.string().required(t('validation_requiredError')),
    mountPath: mountPathValidation,
  });

  useEffect(() => {
    if (storageAccounts.value.length === 0) {
      setConfigurationOption(ConfigurationOption.Advanced);
      setBasicDisabled(true);
    } else if (azureStorageMount.accountName && !storageAccounts.value.find(x => x.name === azureStorageMount.accountName)) {
      setConfigurationOption(ConfigurationOption.Advanced);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Formik
      initialValues={initialFormValue}
      onSubmit={values => {
        updateAzureStorageMount({
          ...values,
          mountPath: getMountPathInputValue(values.mountPath),
        });
      }}
      validationSchema={enableValidation && validationSchema}
      render={(formProps: FormikProps<FormAzureStorageMounts>) => {
        const actionBarPrimaryButtonProps = {
          id: 'save',
          title: t('ok'),
          onClick: formProps.submitForm,
          disable: !formProps.isValid || !formProps.dirty || formProps.isValidating,
        };

        const actionBarSecondaryButtonProps = {
          id: 'cancel',
          title: t('cancel'),
          onClick: cancel,
          disable: false,
        };

        return (
          <Form className={addEditFormStyle}>
            <Field
              name={'name'}
              label={t('_name')}
              component={TextField}
              id={`azure-storage-mounts-name`}
              ariaLabel={t('_name')}
              errorMessage={formProps.errors && formProps.errors.name}
              required={true}
              autoFocus
            />
            <Field
              id="azure-storage-mounts-configuration-options"
              selectedKey={configurationOption}
              label={t('configurationOptions')}
              component={RadioButton}
              options={[
                {
                  key: ConfigurationOption.Basic,
                  text: t('basic'),
                  disabled: basicDisabled,
                },
                {
                  key: ConfigurationOption.Advanced,
                  text: t('advanced'),
                },
              ]}
              onChange={(e: any, configOptions: IChoiceGroupOption) => {
                setConfigurationOption(configOptions.key);
              }}
            />
            <AzureStorageMountsAddEditSubForm {...props} {...formProps} configurationOption={configurationOption} />
            <Field
              name={'mountPath'}
              label={t('mountPath')}
              component={TextField}
              id={`azure-storage-mounts-path`}
              prefix={setMountPathPrefix()}
              mouseOverToolTip={displayMountPathInfoBubble()}
              errorMessage={formProps.errors && formProps.errors.mountPath}
              required={true}
              validate={validateMountPath}
              styles={textFieldPrefixStylesOverride(!isLinuxOrContainer())}
            />
            <Field
              name={'sticky'}
              label={t('sticky')}
              component={Checkbox}
              id={'azure-storage-mounts-sticky'}
              checked={!!formProps.values.sticky}
              onChange={(_?: React.FormEvent<HTMLElement | HTMLInputElement>, checked = false) => {
                formProps.setFieldValue('sticky', checked);
              }}
              styles={{
                root: formElementStyle,
              }}
            />
            <ActionBar
              id="handler-mappings-edit-footer"
              primaryButton={actionBarPrimaryButtonProps}
              secondaryButton={actionBarSecondaryButtonProps}
              validating={formProps.isValidating}
            />
          </Form>
        );
      }}
    />
  );
};

type AzureStorageMountsAddEdtSubFormProps = FormikProps<FormAzureStorageMounts> &
  AzureStorageMountsAddEditPropsCombined & {
    configurationOption: string;
  };
const AzureStorageMountsAddEditSubForm: React.FC<AzureStorageMountsAddEdtSubFormProps> = props => {
  const { configurationOption, ...rest } = props;

  const [fileShareInfoBubbleMessage, setFileShareInfoBubbleMessage] = useState<string>();
  const { t } = useTranslation();

  React.useEffect(() => {
    setFileShareInfoBubbleMessage(rest.values.type === StorageType.azureFiles ? t('shareNameInfoBubbleMessage') : undefined);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest.values.type]);

  return (
    <>
      {configurationOption === ConfigurationOption.Basic && (
        <AzureStorageMountsAddEditBasic {...rest} fileShareInfoBubbleMessage={fileShareInfoBubbleMessage} />
      )}
      {configurationOption === ConfigurationOption.Advanced && (
        <AzureStorageMountsAddEditAdvanced {...rest} fileShareInfoBubbleMessage={fileShareInfoBubbleMessage} />
      )}
    </>
  );
};

export const messageBanner = style({
  paddingLeft: '5px',
  marginBottom: '15px',
});

export default AzureStorageMountsAddEdit;
