import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Autocomplete,
} from '@mui/material';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import { FormData, CustomSolarPanelData } from '../../models/interfaces/deviceInterfaces';
import { validateSolarPanelForm } from '../../utils/validationUtils';

// ---------------- Virtualization Helper for Autocomplete ----------------
const LISTBOX_PADDING = 8;
function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props;
  return React.cloneElement(data[index] as React.ReactElement, {
    style: { ...style, top: (style.top as number) + LISTBOX_PADDING },
  });
}
const OuterElementContext = React.createContext({});
const OuterElementType = React.forwardRef<HTMLDivElement>((props, ref) => {
  const outerProps = React.useContext(OuterElementContext);
  return <div ref={ref} {...props} {...outerProps} />;
});
export const VirtualizedListboxComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLElement>
>(function VirtualizedListboxComponent(props, ref) {
  const { children, ...other } = props;
  const itemData = React.Children.toArray(children);
  const itemCount = itemData.length;
  const itemSize = 36;
  return (
    <div ref={ref}>
      <OuterElementContext.Provider value={other}>
        <FixedSizeList
          height={Math.min(8 * itemSize, itemCount * itemSize) + 2 * LISTBOX_PADDING}
          width="100%"
          itemData={itemData}
          itemSize={itemSize}
          itemCount={itemCount}
          overscanCount={5}
          outerElementType={OuterElementType}
        >
          {renderRow}
        </FixedSizeList>
      </OuterElementContext.Provider>
    </div>
  );
});

// ---------------- Props for SolarPanelForm ----------------
interface SolarPanelFormProps {
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  handleCustomChange: (fieldPath: string, value: any) => void;
  manualEntry: boolean;
  setManualEntry: React.Dispatch<React.SetStateAction<boolean>>;
  modulesList: any[];
  invertersList: any[];
}

/**
 * SolarPanelForm Component
 * Form for adding or editing solar panels.
 * When the user clicks "Submit", validateSolarPanelForm is called.
 * If any required fields (including Rows in parallel, Panels per row,
 * Orientation, and Tilt) are empty or invalid, an error popup is shown and
 * submission is blocked.
 */
const SolarPanelForm: React.FC<SolarPanelFormProps> = ({
  formData,
  handleChange,
  handleCustomChange,
  manualEntry,
  setManualEntry,
  modulesList,
  invertersList,
}) => {
  // Submission handler: validates the form data and, if valid, proceeds with update/save.
  const handleSubmit = () => {
    const errors = validateSolarPanelForm(formData, manualEntry);
    if (errors.length > 0) {
      alert(errors.map((err) => `${err.field}: ${err.message}`).join('\n'));
    } else {
      alert('Solar panel data is valid. Proceeding with update/save.');
      // Call your save/update function here.
    }
  };

  // Helper function to prevent invalid keys (e, E, +, -) on numeric fields.
  const handlePreventInvalidKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Standard solar panel form using modules and inverters lists.
  const renderStandardForm = () => (
    <Box sx={{ mb: 2 }}>
      <TextField
        label="Name"
        value={formData.name}
        onChange={(e) => handleChange('name', e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Typography variant="h6" gutterBottom>
        Solar Panel Details
      </Typography>
      <Autocomplete
        options={modulesList}
        value={formData.module || ''}
        onChange={(event, newValue) => handleChange('module', newValue || '')}
        renderInput={(params) => (
          <TextField {...params} label="Module" variant="outlined" />
        )}
        ListboxComponent={
          VirtualizedListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>
        }
        sx={{ mb: 2 }}
      />
      <Autocomplete
        options={invertersList}
        value={formData.inverter || ''}
        onChange={(event, newValue) => handleChange('inverter', newValue || '')}
        renderInput={(params) => (
          <TextField {...params} label="Inverter" variant="outlined" />
        )}
        ListboxComponent={
          VirtualizedListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>
        }
        sx={{ mb: 2 }}
      />
      <TextField
        label="Rows in parallel"
        type="number"
        value={formData.numberOfStrings || ''}
        onChange={(e) => handleChange('numberOfStrings', e.target.value)}
        onKeyDown={handlePreventInvalidKeys}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Panels per row"
        type="number"
        value={formData.modulesPerString || ''}
        onChange={(e) => handleChange('modulesPerString', e.target.value)}
        onKeyDown={handlePreventInvalidKeys}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Orientation (°)"
        type="number"
        value={formData.orientation || ''}
        onChange={(e) => handleChange('orientation', e.target.value)}
        onKeyDown={handlePreventInvalidKeys}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Tilt (°)"
        type="number"
        value={formData.tilt}
        onChange={(e) => handleChange('tilt', parseFloat(e.target.value))}
        onKeyDown={handlePreventInvalidKeys}
        inputProps={{ min: 0, max: 359 }}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="text" onClick={handleSubmit}>
        Submit
      </Button>
      <Button variant="text" onClick={() => setManualEntry(true)}>
        Enter Manual Solar Panel Data
      </Button>
    </Box>
  );

  // Manual (custom) solar panel form with full fields.
  const renderCustomForm = () => {
    const custom = formData.customSolarPanelData || ({
      location: {
        name: '',
        latitude: 0,
        longitude: 0,
        altitude: 0,
        timezone: '',
      },
      tilt: 30,
      numberOfStrings: 1,
      modulesPerString: 1,
      orientation: 180,
      custom_solar_module: {
        name: '',
        pdc0: 0,
        gamma_pdc: 0,
        bvoco: 0,
        bvmpo: 0,
        impo: 0,
        vmpo: 0,
        pmpo: 0,
        a_c: 0,
        n_s: 0,
        t_noct: 0,
      },
      custom_inverter: {
        name: '',
        pdc0: 0,
        paco: 0,
        pdco: 0,
        vdco: 0,
        pso: 0,
        c0: 0,
        c1: 0,
        c2: 0,
        c3: 0,
      },
      custom_temp_model_params: {
        u_c: 0,
        u_v: 0,
        eta_m: 0,
        alpha_absorption: 0,
      },
    } as CustomSolarPanelData);

    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Manual Solar Panel Data Entry
        </Typography>
        <Typography variant="subtitle1">Location</Typography>
        <TextField
          label="Location Name"
          value={custom.location.name}
          onChange={(e) => handleCustomChange('location.name', e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Latitude"
          type="number"
          value={custom.location.latitude}
          onChange={(e) =>
            handleCustomChange('location.latitude', parseFloat(e.target.value))
          }
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Longitude"
          type="number"
          value={custom.location.longitude}
          onChange={(e) =>
            handleCustomChange('location.longitude', parseFloat(e.target.value))
          }
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Altitude"
          type="number"
          value={custom.location.altitude}
          onChange={(e) =>
            handleCustomChange('location.altitude', parseFloat(e.target.value))
          }
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Timezone"
          value={custom.location.timezone}
          onChange={(e) => handleCustomChange('location.timezone', e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">System Parameters</Typography>
        <TextField
          label="Tilt (°)"
          type="number"
          value={custom.tilt}
          onChange={(e) => handleCustomChange('tilt', parseFloat(e.target.value))}
          onKeyDown={handlePreventInvalidKeys}
          inputProps={{ min: 0, max: 359 }}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Rows in parallel"
          type="number"
          value={custom.numberOfStrings || ''}
          onChange={(e) => handleCustomChange('numberOfStrings', parseInt(e.target.value))}
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Panels per row"
          type="number"
          value={custom.modulesPerString || ''}
          onChange={(e) => handleCustomChange('modulesPerString', parseInt(e.target.value))}
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Orientation (°)"
          type="number"
          value={custom.orientation}
          onChange={(e) => handleCustomChange('orientation', parseFloat(e.target.value))}
          onKeyDown={handlePreventInvalidKeys}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button variant="text" onClick={handleSubmit}>
          Submit
        </Button>
        <Button variant="text" onClick={() => setManualEntry(false)}>
          Back to Standard Solar Panel Form
        </Button>
      </Box>
    );
  };

  return <>{manualEntry ? renderCustomForm() : renderStandardForm()}</>;
};

export default SolarPanelForm;
