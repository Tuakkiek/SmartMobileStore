import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';

const IPhoneSpecsForm = ({ specs, onSpecsChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onSpecsChange({ ...specs, [name]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="chip">Chip</Label>
        <Input id="chip" name="chip" value={specs.chip} onChange={handleChange} placeholder="Nhập chip" />
      </div>
      <div>
        <Label htmlFor="ram">RAM</Label>
        <Input id="ram" name="ram" value={specs.ram} onChange={handleChange} placeholder="Nhập RAM" />
      </div>
      <div>
        <Label htmlFor="storage">Dung lượng</Label>
        <Input id="storage" name="storage" value={specs.storage} onChange={handleChange} placeholder="Nhập dung lượng" />
      </div>
      <div>
        <Label htmlFor="screenSize">Kích thước màn hình</Label>
        <Input id="screenSize" name="screenSize" value={specs.screenSize} onChange={handleChange} placeholder="Nhập kích thước màn hình" />
      </div>
      <div>
        <Label htmlFor="screenTech">Công nghệ màn hình</Label>
        <Input id="screenTech" name="screenTech" value={specs.screenTech} onChange={handleChange} placeholder="Nhập công nghệ màn hình" />
      </div>
      <div>
        <Label htmlFor="battery">Pin</Label>
        <Input id="battery" name="battery" value={specs.battery} onChange={handleChange} placeholder="Nhập dung lượng pin" />
      </div>
      <div>
        <Label htmlFor="os">Hệ điều hành</Label>
        <Input id="os" name="os" value={specs.os} onChange={handleChange} placeholder="Nhập hệ điều hành" />
      </div>
      <div>
        <Label htmlFor="resolution">Độ phân giải</Label>
        <Input id="resolution" name="resolution" value={specs.resolution} onChange={handleChange} placeholder="Nhập độ phân giải" />
      </div>
      <div>
        <Label htmlFor="ports">Cổng kết nối</Label>
        <Input id="ports" name="ports" value={specs.ports} onChange={handleChange} placeholder="Nhập cổng kết nối" />
      </div>
    </div>
  );
};

export default IPhoneSpecsForm;