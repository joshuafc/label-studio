import React from 'react';
import { useHistory } from 'react-router';
import { Button, ToggleItems } from '../../components';
import { Modal } from '../../components/Modal/Modal';
import { Space } from '../../components/Space/Space';
import { useAPI } from '../../providers/ApiProvider';
import { cn } from '../../utils/bem';
import { ConfigPage } from './Config/Config';
import "./CreateProject.styl";
import { ImportPage } from './Import/Import';
import { useImportPage } from './Import/useImportPage';
import { useDraftProject } from './utils/useDraftProject';
import { Trans, useTranslation } from 'react-i18next';
import "../../translations/i18n";

const ProjectName = ({ name, setName, onSaveName, onSubmit, error, description, setDescription, show = true }) => {
  const { t } = useTranslation();

  if( !show )
    return null;
  return (
    <form className={cn("project-name")} onSubmit={e => { e.preventDefault(); onSubmit(); }}>
      <div className="field field--wide">
        <label htmlFor="project_name">{t("pages.create_project.project_name.name_title")}</label>
        <input name="name" id="project_name" value={name} onChange={e => setName(e.target.value)} onBlur={onSaveName} />
        {error && <span className="error">{error}</span>}
      </div>
      <div className="field field--wide">
        <label htmlFor="project_description">{t("pages.create_project.project_name.description_title")}</label>
        <textarea
          name="description"
          id="project_description"
          placeholder={t("pages.create_project.project_name.description_placeholder")}
          rows="4"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
    </form>
  );
};

export const CreateProject = ({ onClose }) => {
  const [step, setStep] = React.useState("name"); // name | import | config
  const [waiting, setWaitingStatus] = React.useState(false);
  const { t } = useTranslation();
  const project = useDraftProject();
  const history = useHistory();
  const api = useAPI();

  const [name, setName] = React.useState("");
  const [error, setError] = React.useState();
  const [description, setDescription] = React.useState("");
  const [config, setConfig] = React.useState("<View></View>");

  React.useEffect(() => { setError(null); }, [name]);

  const { columns, uploading, uploadDisabled, finishUpload, pageProps } = useImportPage(project);

  const rootClass = cn("create-project");
  const tabClass = rootClass.elem("tab");
  const steps = {
    name: <span className={tabClass.mod({ disabled: !!error })}>{t("pages.create_project.steps.name")}</span>,
    import: <span className={tabClass.mod({ disabled: uploadDisabled })}>{t("pages.create_project.steps.import")}</span>,
    config: t("pages.create_project.steps.config"),
  };

  // name intentionally skipped from deps:
  // this should trigger only once when we got project loaded
  React.useEffect(() => project && !name && setName(project.title), [project]);

  const projectBody = React.useMemo(() => ({
    title: name,
    description,
    label_config: config,
  }), [name, description, config]);

  const onCreate = React.useCallback(async () => {
    const imported = await finishUpload();

    if (!imported) return;

    setWaitingStatus(true);
    const response = await api.callApi('updateProject',{
      params: {
        pk: project.id,
      },
      body: projectBody,
    });

    setWaitingStatus(false);

    if (response !== null) {
      history.push(`/projects/${response.id}/data`);
    }
  }, [project, projectBody, finishUpload]);

  const onSaveName = async () => {
    if (error) return;
    const res = await api.callApi('updateProjectRaw', {
      params: {
        pk: project.id,
      },
      body: {
        title: name,
      },
    });

    if (res.ok) return;
    const err = await res.json();

    setError(err.validation_errors?.title);
  };

  const onDelete = React.useCallback(async () => {
    setWaitingStatus(true);
    if (project) await api.callApi('deleteProject', {
      params: {
        pk: project.id,
      },
    });
    setWaitingStatus(false);
    history.replace("/projects");
    onClose?.();
  }, [project]);

  return (
    <Modal onHide={onDelete} fullscreen visible bare closeOnClickOutside={false}>
      <div className={rootClass}>
        <Modal.Header>
          <h1>{t("pages.create_project.title")}</h1>
          <ToggleItems items={steps} active={step} onSelect={setStep} />

          <Space>
            <Button look="danger" size="compact" onClick={onDelete} waiting={waiting}>{t("pages.create_project.delete_button")}</Button>
            <Button look="primary" size="compact" onClick={onCreate} waiting={waiting || uploading} disabled={!project || uploadDisabled || error}>
              {t("pages.create_project.save_button")}
            </Button>
          </Space>
        </Modal.Header>
        <ProjectName
          name={name}
          setName={setName}
          error={error}
          onSaveName={onSaveName}
          onSubmit={onCreate}
          description={description}
          setDescription={setDescription}
          show={step === "name"}
        />
        <ImportPage project={project} show={step === "import"} {...pageProps} />
        <ConfigPage project={project} onUpdate={setConfig} show={step === "config"} columns={columns} disableSaveButton={true} />
      </div>
    </Modal>
  );
};
